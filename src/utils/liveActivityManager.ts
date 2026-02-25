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
import { SendMessage_print, SendMessage_toIosAndAndroid } from "./sendMessage";
import { Subscriptions_hasSubscription } from "./subscriptions";
import { UrlUtils } from "./url";

declare const __HOST__: string;

interface ILiveActivitySet {
  status: ISetsStatus;
  isWarmup: boolean;
}

interface ILiveActivityEntry {
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
}

interface ILiveActivityRest {
  restTimerSince: number;
  restTimer: number;
}

interface ILiveActivityState {
  restTimer?: ILiveActivityRest;
  historyEntryState?: ILiveActivityEntry;
  workoutStartTimestamp: number;
  ignoreDoNotDisturb: boolean;
}

export class LiveActivityManager {
  private static getLiveActivityEntry(
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
      exerciseImageUrl = UrlUtils.build(exerciseImageUrl, __HOST__)?.toString();
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
      targetReps: set.reps ? `${n(set.reps)}${set.isAmrap ? "+" : ""}` : undefined,
      targetWeight: set.weight ? `${Weight_print(set.weight)}${set.askWeight ? "+" : ""}` : undefined,
      targetRPE: set.rpe != null ? `${n(set.rpe)}${set.logRpe ? "+" : ""}` : undefined,
      targetTimer: set.timer != null ? set.timer.toString() : undefined,
      plates:
        (plates?.plates || []).length > 0
          ? Weight_formatOneSide(settings, plates?.plates || [], entry.exercise)
          : "None",
      currentWeight: currentWeight != null ? Weight_print(currentWeight) : undefined,
      currentReps: currentReps != null ? currentReps.toString() : undefined,
      isWarmup: isNextSetWarmup,
      canCompleteFromLiveActivity,
    };
    return state;
  }

  public static updateProgressLiveActivity(
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
    LiveActivityManager.updateLiveActivity(
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

  public static updateLiveActivity(
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
    const liveActivityEntry = this.getLiveActivityEntry(progress, entryIndex, setIndex, programExercise, settings);
    const attributes: ILiveActivityState = {
      workoutStartTimestamp: progress.startTime,
      historyEntryState: liveActivityEntry,
      restTimer:
        progress.timerSince != null && progress.timer != null
          ? {
              restTimerSince: restTimerSince ?? progress.timerSince,
              restTimer: restTimer ?? progress.timer,
            }
          : undefined,
      ignoreDoNotDisturb: !!settings.ignoreDoNotDisturb,
    };
    SendMessage_print(
      `Main App: Updating live activity for ${liveActivityEntry?.exerciseName} (${liveActivityEntry?.entryIndex}/${liveActivityEntry?.setIndex})`
    );
    SendMessage_toIosAndAndroid({ type: "updateLiveActivity", data: JSON.stringify(attributes) });
  }

  public static updateLiveActivityForNextEntry(
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
    this.updateLiveActivity(
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
}
