import { JSX, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { ExercisePickerContent } from "../../components/exercisePicker/bottomSheetExercisePicker";
import {
  Progress_lbProgress,
  Progress_isCurrent,
  Progress_forceUpdateEntryIndex,
  Progress_addExercise,
  Progress_changeExercise,
} from "../../models/progress";
import {
  Program_getFullProgram,
  Program_evaluate,
  Program_fullProgram,
  Program_isEmpty,
  Program_getProgramExerciseByTypeWeekAndDay,
  Program_nextHistoryEntry,
  Program_getDayData,
} from "../../models/program";
import { Settings_toggleStarredExercise, Settings_changePickerSettings } from "../../models/settings";
import { Exercise_handleCustomExerciseChange } from "../../models/exercise";
import { updateState, updateProgress } from "../../models/state";
import { buildCustomDispatch } from "../../ducks/types";
import { IHistoryRecord } from "../../types";
import { lb } from "lens-shmens";
import type { IRootStackParamList } from "../types";

export function NavModalExercisePicker(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "exercisePickerModal";
    params: IRootStackParamList["exercisePickerModal"];
  }>();
  const { progressId } = route.params;

  const progress = progressId === 0 ? state.storage.progress?.[0] : state.progress[progressId];
  const exercisePickerState = progress?.ui?.exercisePicker?.state;

  const currentProgram =
    state.storage.currentProgramId != null ? Program_getFullProgram(state, state.storage.currentProgramId) : undefined;
  const program =
    progress && Progress_isCurrent(progress)
      ? Program_getFullProgram(state, progress.programId) ||
        (currentProgram ? Program_fullProgram(currentProgram, state.storage.settings) : undefined)
      : undefined;
  const evaluatedProgram = program ? Program_evaluate(program, state.storage.settings) : undefined;
  const evaluatedCurrentProgram =
    Program_isEmpty(evaluatedProgram) && currentProgram
      ? Program_evaluate(currentProgram, state.storage.settings)
      : evaluatedProgram;

  const pickerDispatch = buildCustomDispatch(
    dispatch,
    Progress_lbProgress(progressId).pi("ui", {}).pi("exercisePicker").pi("state")
  );

  const onClose = (): void => {
    updateState(
      dispatch,
      [Progress_lbProgress(progressId).pi("ui", {}).p("exercisePicker").record(undefined)],
      "Close exercise picker"
    );
    navigation.goBack();
  };

  const shouldGoBack = !progress || !exercisePickerState;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack) {
    return <></>;
  }

  return (
    <SheetScreenContainer onClose={onClose}>
      <ExercisePickerContent
        settings={state.storage.settings}
        isLoggedIn={!!state.user?.id}
        exercisePicker={exercisePickerState}
        usedExerciseTypes={progress.entries.map((e) => e.exercise)}
        evaluatedProgram={evaluatedCurrentProgram}
        dispatch={pickerDispatch}
        onChoose={(selectedExercises) => {
          for (const exercise of selectedExercises) {
            if (exercise.type === "adhoc") {
              if (exercisePickerState.entryIndex == null) {
                Progress_addExercise(dispatch, exercise.exerciseType, progress.entries.length);
              } else {
                Progress_changeExercise(
                  dispatch,
                  state.storage.settings,
                  progress.id,
                  exercise.exerciseType,
                  exercisePickerState.entryIndex,
                  !!state.storage.settings.workoutSettings.shouldKeepProgramExerciseId
                );
              }
            } else if (exercise.type === "program" && evaluatedCurrentProgram) {
              const programExercise = Program_getProgramExerciseByTypeWeekAndDay(
                evaluatedCurrentProgram,
                exercise.exerciseType,
                exercise.week,
                exercise.dayInWeek
              );
              if (programExercise && programExercise.exerciseType) {
                if (exercisePickerState.entryIndex == null) {
                  updateProgress(
                    dispatch,
                    [
                      lb<IHistoryRecord>()
                        .p("entries")
                        .recordModify((entries) => {
                          const nextHistoryEntry = Program_nextHistoryEntry(
                            evaluatedCurrentProgram,
                            Program_getDayData(evaluatedCurrentProgram, evaluatedCurrentProgram.nextDay),
                            entries.length,
                            { ...programExercise, exerciseType: exercise.exerciseType },
                            state.storage.stats,
                            state.storage.settings
                          );
                          return [...entries, nextHistoryEntry].map((e, i) => ({ ...e, index: i }));
                        }),
                    ],
                    "add-exercise"
                  );
                } else {
                  const nextHistoryEntry = Program_nextHistoryEntry(
                    evaluatedCurrentProgram,
                    Program_getDayData(evaluatedCurrentProgram, evaluatedCurrentProgram.nextDay),
                    exercisePickerState.entryIndex,
                    { ...programExercise, exerciseType: exercise.exerciseType },
                    state.storage.stats,
                    state.storage.settings
                  );
                  updateProgress(
                    dispatch,
                    [lb<IHistoryRecord>().p("entries").i(exercisePickerState.entryIndex).record(nextHistoryEntry)],
                    "change-program-exercise"
                  );
                }
              }
            }
          }
          updateState(
            dispatch,
            [Progress_lbProgress(progressId).pi("ui", {}).p("exercisePicker").record(undefined)],
            "Close exercise picker"
          );
          setTimeout(() => {
            Progress_forceUpdateEntryIndex(dispatch);
            document.querySelector(`[data-name=workout-exercise-tab-${progress.entries.length}]`)?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }, 0);
          navigation.goBack();
        }}
        onChangeCustomExercise={(action, exercise, notes) => {
          Exercise_handleCustomExerciseChange(dispatch, action, exercise, notes, state.storage.settings, program);
        }}
        onStar={(key) => Settings_toggleStarredExercise(dispatch, key)}
        onChangeSettings={(pickerSettings) => Settings_changePickerSettings(dispatch, pickerSettings)}
        onClose={onClose}
      />
    </SheetScreenContainer>
  );
}
