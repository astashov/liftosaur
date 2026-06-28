import { Exercise_get, Exercise_getIsUnilateral, Exercise_fullName } from "../models/exercise";
import { ExerciseImageUtils_url } from "../models/exerciseImage";
import { Program_evaluate, Program_getProgramExercise } from "../models/program";
import { ProgramExercise_hasUserPromptedVars } from "../models/programExercise";
import { Progress_shouldShowAmrapModal, Progress_getNextEntry } from "../models/progress";
import { ISetsStatus, Reps_setsStatus, Reps_findNextSetIndex } from "../models/set";
import { Weight_calculatePlates, Weight_print, Weight_formatOneSide } from "../models/weight";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { IHistoryRecord, IProgram, ISettings, ISubscription } from "../types";
import { n } from "./math";
import { NativeWorkoutBridge_updateLiveActivity } from "./nativeWorkoutBridge";
import { SendMessage_print } from "./sendMessage";
import { Subscriptions_hasSubscription } from "./subscriptions";
import { UrlUtils_build } from "./url";

declare const __HOST__: string;

export interface ILiveActivitySet {
  status: ISetsStatus;
  isWarmup: boolean;
}

export interface ILiveActivityEntry {
  exerciseName: string;
  currentSet: number;
  totalSets: number;
  completedSets: ILiveActivitySet[];
  canCompleteFromLiveActivity: boolean;
  isWarmup: boolean;
  entryIndex: number;
  setIndex: number;

  exerciseImageUrl?: string;
  targetReps?: string;
  targetWeight?: string;
  targetRPE?: string;
  targetTimer?: string;
  plates?: string;
  currentWeight?: string;
  currentReps?: string;
  isSetTimer?: boolean;
}

export interface ILiveActivityRest {
  restTimerSince: number;
  restTimer: number;
  // Whether the resting set is part of an `auto` circuit (so the live activity shows "tap to update" when
  // the rest ends, to auto-advance to the next set's work timer). Non-auto rest just expires.
  isAuto: boolean;
}

export interface ILiveActivitySetTimer {
  setTimerSince: number;
  setTimer: number;
  isOverflow: boolean;
  isCompleted: boolean;
  entryIndex: number;
  setIndex: number;
  restTimer: number;
}

export interface ILiveActivityState {
  restTimer?: ILiveActivityRest;
  setTimer?: ILiveActivitySetTimer;
  historyEntryState?: ILiveActivityEntry;
  workoutStartTimestamp: number;
  ignoreDoNotDisturb: boolean;
}

export function LiveActivityManager_getLiveActivityEntry(
  progress: IHistoryRecord,
  entryIndex: number | undefined,
  setIndex: number | undefined,
  programExercise: IPlannerProgramExercise | undefined,
  settings: ISettings
): ILiveActivityEntry | undefined {
  if (entryIndex == null || setIndex == null) {
    return undefined;
  }
  const entry = progress.entries[entryIndex];
  if (!entry) {
    return undefined;
  }
  const exercise = Exercise_get(entry.exercise, settings.exercises);
  const allSets = [...entry.warmupSets, ...entry.sets];
  const set = allSets[setIndex];
  if (setIndex === -1 || !set) {
    return undefined;
  }
  const isNextSetWarmup = setIndex < entry.warmupSets.length;
  const weightForPlates = set.completedWeight ?? set.weight;
  const plates = weightForPlates
    ? Weight_calculatePlates(weightForPlates, settings, weightForPlates.unit || settings.units, entry.exercise)
    : undefined;
  let exerciseImageUrl = ExerciseImageUtils_url(exercise, "small", settings);
  if (exerciseImageUrl) {
    exerciseImageUrl = UrlUtils_build(exerciseImageUrl, __HOST__)?.toString();
  }
  const hasUserPromptedVars = !!(programExercise && ProgramExercise_hasUserPromptedVars(programExercise));
  const canCompleteFromLiveActivity = !Progress_shouldShowAmrapModal(
    entry,
    isNextSetWarmup ? setIndex : setIndex - entry.warmupSets.length,
    isNextSetWarmup ? "warmup" : "workout",
    hasUserPromptedVars,
    settings
  );

  const isUnilateral = Exercise_getIsUnilateral(entry.exercise, settings);
  const currentReps =
    isUnilateral && set.completedRepsLeft != null
      ? `${set.completedRepsLeft}/${set.completedReps ?? set.reps ?? 0}`
      : (set.completedReps ?? set.reps);
  const currentWeight = set.completedWeight ?? set.weight;
  const state: ILiveActivityEntry = {
    exerciseName: Exercise_fullName(exercise, settings),
    exerciseImageUrl,
    currentSet: setIndex + 1,
    totalSets: allSets.length,
    entryIndex: progress.entries.indexOf(entry),
    setIndex,
    completedSets: allSets.map((s, i) => ({
      status: Reps_setsStatus([s]),
      isWarmup: i < entry.warmupSets.length,
    })),
    targetReps: set.reps
      ? `${set.minReps != null ? `${n(set.minReps)}-` : ""}${n(set.reps)}${set.isAmrap ? "+" : ""}`
      : undefined,
    targetWeight: set.weight ? `${Weight_print(set.weight)}${set.askWeight ? "+" : ""}` : undefined,
    targetRPE: set.rpe != null ? `${n(set.rpe)}${set.logRpe ? "+" : ""}` : undefined,
    targetTimer: set.timer != null ? set.timer.toString() : undefined,
    plates:
      (plates?.plates || []).length > 0 ? Weight_formatOneSide(settings, plates?.plates || [], entry.exercise) : "None",
    currentWeight: currentWeight != null ? Weight_print(currentWeight) : undefined,
    currentReps: currentReps != null ? currentReps.toString() : undefined,
    isWarmup: isNextSetWarmup,
    canCompleteFromLiveActivity,
    isSetTimer: set.setTimer != null,
  };
  return state;
}

export function LiveActivityManager_updateProgressLiveActivity(
  program: IProgram | undefined,
  progress: IHistoryRecord,
  settings: ISettings,
  subscription: ISubscription | undefined,
  entryIndex: number | undefined,
  setIndex: number | undefined,
  restTimer: number | undefined,
  restTimerSince: number | undefined
): void {
  const entry = entryIndex != null ? progress.entries[entryIndex] : undefined;
  const evaluatedProgram = program ? Program_evaluate(program, settings) : undefined;
  const programExercise =
    evaluatedProgram && entry
      ? Program_getProgramExercise(progress.day, evaluatedProgram, entry.programExerciseId)
      : undefined;
  LiveActivityManager_updateLiveActivity(
    progress,
    entryIndex,
    setIndex,
    restTimer,
    restTimerSince,
    programExercise,
    settings,
    subscription
  );
}

export function LiveActivityManager_updateLiveActivity(
  progress: IHistoryRecord,
  entryIndex: number | undefined,
  setIndex: number | undefined,
  restTimer: number | undefined,
  restTimerSince: number | undefined,
  programExercise: IPlannerProgramExercise | undefined,
  settings: ISettings,
  subscription?: ISubscription
): void {
  if (!subscription || !Subscriptions_hasSubscription(subscription)) {
    return;
  }
  let liveActivityEntry = LiveActivityManager_getLiveActivityEntry(
    progress,
    entryIndex,
    setIndex,
    programExercise,
    settings
  );

  // A running set timer takes over the live activity entirely: it shows the timed set's
  // count-up clock and "complete the set" buttons instead of the next-exercise/rest layout.
  // It's driven by `progress.setTimer` so every existing update call site reflects it
  // automatically, and reverts to the normal layout the moment the clock is cleared.
  const setTimerModal = progress.setTimer;
  let setTimerState: ILiveActivitySetTimer | undefined;
  if (setTimerModal) {
    const timedEntry = progress.entries[setTimerModal.entryIndex];
    const timedSet = timedEntry?.sets[setTimerModal.setIndex];
    if (timedEntry && timedSet) {
      const absoluteSetIndex = timedEntry.warmupSets.length + setTimerModal.setIndex;
      const timedEntryState = LiveActivityManager_getLiveActivityEntry(
        progress,
        setTimerModal.entryIndex,
        absoluteSetIndex,
        programExercise,
        settings
      );
      // Count current/total across warmups+work (the absolute index), matching the rest timer view — so a
      // timed set after warmups reads "4/5" rather than the work-only "2/3".
      liveActivityEntry = timedEntryState ?? liveActivityEntry;
      setTimerState = {
        setTimerSince: setTimerModal.startedAt,
        setTimer: timedSet.setTimer ?? 0,
        isOverflow: !!timedSet.isOverflowSetTimer,
        isCompleted: !!timedSet.isCompleted,
        entryIndex: setTimerModal.entryIndex,
        setIndex: setTimerModal.setIndex,
        restTimer: timedSet.timer ?? 0,
      };
    }
  }

  const restingSet =
    progress.timerEntryIndex != null && progress.timerSetIndex != null
      ? progress.entries[progress.timerEntryIndex]?.sets[progress.timerSetIndex]
      : undefined;
  const attributes: ILiveActivityState = {
    workoutStartTimestamp: progress.startTime,
    historyEntryState: liveActivityEntry,
    setTimer: setTimerState,
    restTimer:
      setTimerState == null && progress.timerSince != null && progress.timer != null
        ? {
            restTimerSince: restTimerSince ?? progress.timerSince,
            restTimer: restTimer ?? progress.timer,
            isAuto: !!restingSet?.auto,
          }
        : undefined,
    ignoreDoNotDisturb: !!settings.ignoreDoNotDisturb,
  };
  SendMessage_print(
    `Main App: Updating live activity for ${liveActivityEntry?.exerciseName} (${liveActivityEntry?.entryIndex}/${liveActivityEntry?.setIndex})`
  );
  // eslint-disable-next-line no-console
  console.log(
    `[LiveActivity] update ${liveActivityEntry?.exerciseName} (${liveActivityEntry?.entryIndex}/${liveActivityEntry?.setIndex}) — setTimer: ${
      setTimerState ? `${setTimerState.setTimer}s since ${setTimerState.setTimerSince}` : "none"
    }, rest: ${attributes.restTimer ? `${attributes.restTimer.restTimer}s` : "none"}`
  );
  NativeWorkoutBridge_updateLiveActivity(attributes);
}

export function LiveActivityManager_updateLiveActivityForNextEntry(
  progress: IHistoryRecord,
  entryIndex: number,
  mode: "workout" | "warmup",
  programExercise: IPlannerProgramExercise | undefined,
  settings: ISettings,
  subscription?: ISubscription
): void {
  const currentEntry = progress.entries[entryIndex];
  if (!currentEntry) {
    return;
  }
  const nextEntry = Progress_getNextEntry(progress, currentEntry, mode, true);
  const nextEntryIndex = nextEntry ? progress.entries.indexOf(nextEntry) : undefined;
  const nextSetIndex = nextEntry ? Reps_findNextSetIndex(nextEntry) : undefined;
  LiveActivityManager_updateLiveActivity(
    progress,
    nextEntryIndex,
    nextSetIndex,
    progress.timer,
    progress.timerSince,
    programExercise,
    settings,
    subscription
  );
}
