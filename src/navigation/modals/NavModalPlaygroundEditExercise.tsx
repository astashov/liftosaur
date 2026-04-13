import { JSX, useCallback, useEffect, useMemo } from "react";
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
import { IPlannerProgramExercise, IPlannerState } from "../../pages/planner/models/types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { ProgramToPlanner } from "../../models/programToPlanner";
import type { IRootStackParamList } from "../types";
import { ISettings } from "../../types";

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

function NavModalPlaygroundEditExercisePlayground(props: { weekIndex: number; dayIndex: number }): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const { weekIndex, dayIndex } = props;

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

  const clearEditModal = useCallback(() => {
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
          .pi("ui", {})
          .p("editModal")
          .record(undefined),
      ],
      "Close playground edit modal"
    );
  }, [dispatch, weekIndex, dayIndex]);

  useEffect(() => {
    return () => clearEditModal();
  }, [clearEditModal]);

  const onClose = (): void => {
    clearEditModal();
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

function NavModalPlaygroundEditExercisePreview(props: { programId: string }): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const { programId } = props;
  const settings = state.storage.settings;

  const plannerState = state.editProgramStates?.[programId];
  const plannerDispatch = useCallback(
    plannerState
      ? buildPlannerDispatch(dispatch, lb<IState>().p("editProgramStates").p(programId), plannerState)
      : () => {},
    [dispatch, programId, plannerState]
  );

  const previewExerciseModal = plannerState?.ui?.previewExerciseModal;
  const programExercise = previewExerciseModal?.plannerExercise;
  const day = previewExerciseModal?.day;

  const evaluatedProgram = plannerState ? Program_evaluate(plannerState.current.program, settings) : undefined;

  const onClose = (): void => {
    if (plannerState) {
      plannerDispatch(
        lb<IPlannerState>().pi("ui").p("previewExerciseModal").record(undefined),
        "Close preview exercise modal"
      );
    }
    navigation.goBack();
  };

  const shouldGoBack = !plannerState || !programExercise || !evaluatedProgram || day == null;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack) {
    return <></>;
  }

  return (
    <NavModalPreviewExerciseEditContent
      programExercise={programExercise!}
      settings={settings}
      evaluatedProgram={evaluatedProgram!}
      day={day!}
      plannerDispatch={plannerDispatch}
      onClose={onClose}
    />
  );
}

function NavModalPreviewExerciseEditContent(props: {
  programExercise: IPlannerProgramExercise;
  settings: ISettings;
  evaluatedProgram: IEvaluatedProgram;
  day: number;
  plannerDispatch: ILensDispatch<IPlannerState>;
  onClose: () => void;
}): JSX.Element {
  const { programExercise, settings, evaluatedProgram, day, plannerDispatch, onClose } = props;
  return (
    <ModalScreenContainer onClose={onClose}>
      <ProgramPreviewPlaygroundExerciseEditContent
        hideVariables={true}
        programExercise={programExercise}
        settings={settings}
        onClose={onClose}
        onEditStateVariable={(stateKey, newValue) => {
          const dayData = Program_getDayData(evaluatedProgram, day);
          const lensRecording = EditProgramLenses_properlyUpdateStateVariable(
            lb<IEvaluatedProgram>()
              .p("weeks")
              .i(dayData.week - 1)
              .p("days")
              .i(dayData.dayInWeek - 1)
              .p("exercises")
              .find((e) => e.key === programExercise.key),
            {
              [stateKey]: Program_stateValue(PlannerProgramExercise_getState(programExercise), stateKey, newValue),
            }
          );
          const newEvaluatedProgram = lensRecording.reduce((acc, lens) => lens.fn(acc), evaluatedProgram);
          const newPlanner = new ProgramToPlanner(newEvaluatedProgram, settings).convertToPlanner();
          plannerDispatch(
            lb<IPlannerState>().p("current").p("program").p("planner").record(newPlanner),
            "Update state variables from preview exercise modal"
          );
        }}
        onEditVariable={() => {}}
      />
    </ModalScreenContainer>
  );
}

export function NavModalPlaygroundEditExercise(): JSX.Element {
  const route = useRoute<{
    key: string;
    name: "playgroundEditModal";
    params: IRootStackParamList["playgroundEditModal"];
  }>();
  const params = route.params;

  if (params.context === "preview") {
    return <NavModalPlaygroundEditExercisePreview programId={params.programId} />;
  }
  return <NavModalPlaygroundEditExercisePlayground weekIndex={params.weekIndex} dayIndex={params.dayIndex} />;
}
