import { JSX, useEffect, useMemo } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ProgramPreviewPlaygroundExerciseEditContent } from "../../components/preview/programPreviewPlaygroundExerciseEditModal";
import {
  Program_evaluate,
  Program_getProgramExercise,
  Program_getDayData,
  Program_stateValue,
} from "../../models/program";
import { Exercise_toKey } from "../../models/exercise";
import { Weight_build } from "../../models/weight";
import { EditProgramLenses_properlyUpdateStateVariable } from "../../models/editProgramLenses";
import { PlannerProgramExercise_getState } from "../../pages/planner/models/plannerProgramExercise";
import { IEvaluatedProgram } from "../../models/program";
import { IState, updateState } from "../../models/state";
import { lb } from "lens-shmens";
import {
  playgroundOnProgramChange,
  playgroundOnSettingsChange,
} from "../../components/preview/programPreviewPlayground";
import { IProgramPreviewPlaygroundState } from "../../components/preview/programPreviewPlaygroundSetup";
import { ILensDispatch } from "../../utils/useLensReducer";
import type { IRootStackParamList } from "../types";

function buildGlobalPlaygroundDispatch(
  globalDispatch: ReturnType<typeof useAppState>["dispatch"]
): ILensDispatch<IProgramPreviewPlaygroundState> {
  return (lensRecordings, desc) => {
    const recordings = Array.isArray(lensRecordings) ? lensRecordings : [lensRecordings];
    updateState(
      globalDispatch,
      recordings.map((lr) =>
        lb<IState>()
          .pi("playgroundState")
          .recordModify((s) => lr.fn(s))
      ),
      desc
    );
  };
}

export function NavModalPlaygroundEditExercise(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "playgroundEditModal";
    params: IRootStackParamList["playgroundEditModal"];
  }>();
  const { weekIndex, dayIndex } = route.params;

  const playgroundState = state.playgroundState;
  const daySetup = playgroundState?.progresses[weekIndex]?.days[dayIndex];
  const progress = daySetup?.progress;
  const editModal = progress?.ui?.editModal;
  const day = daySetup?.day;

  const evaluatedProgram = playgroundState
    ? Program_evaluate(playgroundState.program, playgroundState.settings)
    : undefined;

  const programExercise =
    editModal && evaluatedProgram && day != null
      ? Program_getProgramExercise(day, evaluatedProgram, editModal.programExerciseId)
      : undefined;

  const playgroundDispatch = useMemo(() => buildGlobalPlaygroundDispatch(dispatch), [dispatch]);

  const onClose = (): void => {
    updateState(
      dispatch,
      [
        lb<IState>()
          .pi("playgroundState")
          .pi("progresses")
          .pi(weekIndex)
          .p("days")
          .pi(dayIndex)
          .p("progress")
          .pi("ui")
          .p("editModal")
          .record(undefined),
      ],
      "Close playground edit modal"
    );
    navigation.goBack();
  };

  const shouldGoBack = !playgroundState || !progress || !editModal || !evaluatedProgram || !programExercise;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose}>
      <ProgramPreviewPlaygroundExerciseEditContent
        programExercise={programExercise!}
        settings={playgroundState!.settings}
        onClose={onClose}
        onEditStateVariable={(stateKey, newValue) => {
          const dayData = Program_getDayData(evaluatedProgram!, day!);
          const lensRecording = EditProgramLenses_properlyUpdateStateVariable(
            lb<IEvaluatedProgram>()
              .p("weeks")
              .i(dayData.week - 1)
              .p("days")
              .i(dayData.dayInWeek - 1)
              .p("exercises")
              .find((e) => e.key === editModal!.programExerciseId),
            {
              [stateKey]: Program_stateValue(PlannerProgramExercise_getState(programExercise!), stateKey, newValue),
            }
          );
          const newEvalProgram = lensRecording.reduce((acc, lens) => lens.fn(acc), evaluatedProgram!);
          playgroundOnProgramChange(playgroundDispatch, newEvalProgram, state.storage.stats, playgroundState!);
        }}
        onEditVariable={(variableKey, newValue) => {
          if (!programExercise!.exerciseType) {
            return;
          }
          const exerciseType = Exercise_toKey(programExercise!.exerciseType);
          const currentSettings = playgroundState!.settings;
          const newSettings = {
            ...currentSettings,
            exerciseData: {
              ...currentSettings.exerciseData,
              [exerciseType]: {
                ...currentSettings.exerciseData[exerciseType],
                [variableKey]: Weight_build(newValue, currentSettings.units),
              },
            },
          };
          playgroundOnSettingsChange(playgroundDispatch, newSettings, state.storage.stats, evaluatedProgram!);
        }}
      />
    </ModalScreenContainer>
  );
}
