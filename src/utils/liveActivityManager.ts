import { Exercise } from "../models/exercise";
import { ExerciseImageUtils } from "../models/exerciseImage";
import { ProgramExercise } from "../models/programExercise";
import { Progress } from "../models/progress";
import { ISetsStatus, Reps } from "../models/set";
import { Weight } from "../models/weight";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { IHistoryRecord, ISettings, ISubscription } from "../types";
import { n } from "./math";
import { SendMessage } from "./sendMessage";
import { Subscriptions } from "./subscriptions";
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
    const exercise = Exercise.get(entry.exercise, settings.exercises);
    const allSets = [...entry.warmupSets, ...entry.sets];
    const set = allSets[setIndex];
    if (setIndex === -1 || !set) {
      return undefined;
    }
    const isNextSetWarmup = setIndex < entry.warmupSets.length;
    const plates = set.weight
      ? Weight.calculatePlates(set.weight, settings, set.weight?.unit || settings.units, entry.exercise)
      : undefined;
    let exerciseImageUrl = ExerciseImageUtils.url(exercise, "small", settings);
    if (exerciseImageUrl) {
      exerciseImageUrl = UrlUtils.build(exerciseImageUrl, __HOST__)?.toString();
    }
    const hasUserPromptedVars = !!(programExercise && ProgramExercise.hasUserPromptedVars(programExercise));
    const canCompleteFromLiveActivity = !Progress.shouldShowAmrapModal(
      entry,
      isNextSetWarmup ? setIndex : setIndex - entry.warmupSets.length,
      isNextSetWarmup ? "warmup" : "workout",
      hasUserPromptedVars,
      settings
    );

    const isUnilateral = Exercise.getIsUnilateral(entry.exercise, settings);
    const currentReps =
      isUnilateral && set.completedRepsLeft != null
        ? `${set.completedRepsLeft}/${set.completedReps ?? set.reps ?? 0}`
        : (set.completedReps ?? set.reps);
    const currentWeight = set.completedWeight ?? set.weight;
    const state: ILiveActivityEntry = {
      exerciseName: Exercise.fullName(exercise, settings),
      exerciseImageUrl,
      currentSet: setIndex + 1,
      totalSets: allSets.length,
      entryIndex: progress.entries.indexOf(entry),
      setIndex,
      completedSets: allSets.map((s, i) => ({
        status: Reps.setsStatus([s]),
        isWarmup: i < entry.warmupSets.length,
      })),
      targetReps: set.reps ? `${n(set.reps)}${set.isAmrap ? "+" : ""}` : undefined,
      targetWeight: set.weight ? `${Weight.print(set.weight)}${set.askWeight ? "+" : ""}` : undefined,
      targetRPE: set.rpe != null ? `${n(set.rpe)}${set.logRpe ? "+" : ""}` : undefined,
      targetTimer: set.timer != null ? set.timer.toString() : undefined,
      plates:
        (plates?.plates || []).length > 0
          ? Weight.formatOneSide(settings, plates?.plates || [], entry.exercise)
          : "None",
      currentWeight: currentWeight != null ? Weight.print(currentWeight) : undefined,
      currentReps: currentReps != null ? currentReps.toString() : undefined,
      isWarmup: isNextSetWarmup,
      canCompleteFromLiveActivity,
    };
    return state;
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
    // if (!subscription || !Subscriptions.hasSubscription(subscription)) {
    //   return;
    // }
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
    };
    SendMessage.print(
      `Main App: Updating live activity for ${liveActivityEntry?.exerciseName} (${liveActivityEntry?.entryIndex}/${liveActivityEntry?.setIndex})`
    );
    SendMessage.toIos({ type: "updateLiveActivity", data: JSON.stringify(attributes) });
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
    const nextEntry = Progress.getNextEntry(progress, currentEntry, mode, true);
    const nextEntryIndex = nextEntry ? progress.entries.indexOf(nextEntry) : undefined;
    const nextSetIndex = nextEntry ? Reps.findNextSetIndex(nextEntry) : undefined;
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
