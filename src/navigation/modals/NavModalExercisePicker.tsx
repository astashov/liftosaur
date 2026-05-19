import { JSX, useCallback, useEffect, useMemo, useRef } from "react";
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
import { ICustomExercise, IExercisePickerSelectedExercise, IHistoryRecord } from "../../types";
import { lb } from "lens-shmens";
import type { IRootStackParamList } from "../types";
import type { IExercisePickerSettings } from "../../components/exercisePicker/exercisePickerSettings";

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

  const pickerDispatch = useMemo(
    () => buildCustomDispatch(dispatch, Progress_lbProgress(progressId).pi("ui", {}).pi("exercisePicker").pi("state")),
    [dispatch, progressId]
  );

  const settingsRef = useRef(state.storage.settings);
  settingsRef.current = state.storage.settings;
  const statsRef = useRef(state.storage.stats);
  statsRef.current = state.storage.stats;
  const programRef = useRef(program);
  programRef.current = program;
  const evaluatedCurrentProgramRef = useRef(evaluatedCurrentProgram);
  evaluatedCurrentProgramRef.current = evaluatedCurrentProgram;
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const exercisePickerStateRef = useRef(exercisePickerState);
  exercisePickerStateRef.current = exercisePickerState;

  const onClose = useCallback((): void => {
    updateState(
      dispatch,
      [Progress_lbProgress(progressId).pi("ui", {}).p("exercisePicker").record(undefined)],
      "Close exercise picker"
    );
    navigation.goBack();
  }, [dispatch, progressId, navigation]);

  const onChoose = useCallback(
    (selectedExercises: IExercisePickerSelectedExercise[]) => {
      const currentProgress = progressRef.current;
      const currentPickerState = exercisePickerStateRef.current;
      const currentSettings = settingsRef.current;
      const currentEvaluatedProgram = evaluatedCurrentProgramRef.current;
      if (!currentProgress || !currentPickerState) {
        return;
      }
      for (const exercise of selectedExercises) {
        if (exercise.type === "adhoc") {
          if (currentPickerState.entryIndex == null) {
            Progress_addExercise(dispatch, exercise.exerciseType, currentProgress.entries.length);
          } else {
            Progress_changeExercise(
              dispatch,
              currentSettings,
              currentProgress.id,
              exercise.exerciseType,
              currentPickerState.entryIndex,
              !!currentSettings.workoutSettings.shouldKeepProgramExerciseId
            );
          }
        } else if (exercise.type === "program" && currentEvaluatedProgram) {
          const programExercise = Program_getProgramExerciseByTypeWeekAndDay(
            currentEvaluatedProgram,
            exercise.exerciseType,
            exercise.week,
            exercise.dayInWeek
          );
          if (programExercise && programExercise.exerciseType) {
            if (currentPickerState.entryIndex == null) {
              const newEntryIndex = currentProgress.entries.length;
              updateProgress(
                dispatch,
                [
                  lb<IHistoryRecord>()
                    .p("entries")
                    .recordModify((entries) => {
                      const nextHistoryEntry = Program_nextHistoryEntry(
                        currentEvaluatedProgram,
                        Program_getDayData(currentEvaluatedProgram, currentEvaluatedProgram.nextDay),
                        entries.length,
                        { ...programExercise, exerciseType: exercise.exerciseType },
                        statsRef.current,
                        currentSettings
                      );
                      return [...entries, nextHistoryEntry].map((e, i) => ({ ...e, index: i }));
                    }),
                  lb<IHistoryRecord>().pi("ui", {}).p("currentEntryIndex").record(newEntryIndex),
                ],
                "add-exercise"
              );
            } else {
              const nextHistoryEntry = Program_nextHistoryEntry(
                currentEvaluatedProgram,
                Program_getDayData(currentEvaluatedProgram, currentEvaluatedProgram.nextDay),
                currentPickerState.entryIndex,
                { ...programExercise, exerciseType: exercise.exerciseType },
                statsRef.current,
                currentSettings
              );
              updateProgress(
                dispatch,
                [lb<IHistoryRecord>().p("entries").i(currentPickerState.entryIndex).record(nextHistoryEntry)],
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
      }, 0);
      navigation.goBack();
    },
    [dispatch, progressId, navigation]
  );

  const onChangeCustomExercise = useCallback(
    (action: "upsert" | "delete", exercise: ICustomExercise, notes?: string) => {
      Exercise_handleCustomExerciseChange(dispatch, action, exercise, notes, settingsRef.current, programRef.current);
    },
    [dispatch]
  );

  const onStar = useCallback((key: string) => Settings_toggleStarredExercise(dispatch, key), [dispatch]);
  const onChangeSettings = useCallback(
    (pickerSettings: IExercisePickerSettings) => Settings_changePickerSettings(dispatch, pickerSettings),
    [dispatch]
  );

  const entries = progress?.entries;
  const usedExerciseTypes = useMemo(() => (entries ? entries.map((e) => e.exercise) : []), [entries]);

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
        usedExerciseTypes={usedExerciseTypes}
        evaluatedProgram={evaluatedCurrentProgram}
        dispatch={pickerDispatch}
        onChoose={onChoose}
        onChangeCustomExercise={onChangeCustomExercise}
        onStar={onStar}
        onChangeSettings={onChangeSettings}
        onClose={onClose}
      />
    </SheetScreenContainer>
  );
}
