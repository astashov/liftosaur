import { Exercise } from "../models/exercise";
import { ExerciseImageUtils } from "../models/exerciseImage";
import { Progress } from "../models/progress";
import { ISetsStatus, Reps } from "../models/set";
import { Weight } from "../models/weight";
import { IHistoryEntry, IHistoryRecord, ISettings } from "../types";
import { SendMessage } from "./sendMessage";

interface ILiveActivityEntry {
  exerciseName: string;
  exerciseImageUrl?: string;
  currentSet: number;
  totalSets: number;
  completedSets: ISetsStatus[];
  targetReps: string;
  targetWeight: string;
  targetRPE: string;
  targetTimer: string;
  plates?: string;
  currentWeight: string;
  currentReps: string;
  restTimerSince?: number;
  restTimer?: number;
  canCompleteFromLiveActivity: boolean;
}

interface ILiveActivityState {
  isWorkoutComplete: boolean;
  historyEntryState?: ILiveActivityEntry;
  workoutStartTimestamp: number;
}

interface ILiveActivityAttributes {
  contentState: ILiveActivityState;
  workoutName: string;
}

export class LiveActivityManager {
  private static getLiveActivityEntry(
    progress: IHistoryRecord,
    entry: IHistoryEntry,
    settings: ISettings
  ): ILiveActivityEntry | undefined {
    const exercise = Exercise.get(entry.exercise, settings.exercises);
    const setIndex = Reps.findNextSetIndex(entry);
    const nextSet = Reps.findNextSet(entry);
    if (setIndex === -1 || !nextSet) {
      return undefined;
    }
    const displaySet = Reps.setToDisplaySet(nextSet, false, settings);
    const plates = nextSet.weight
      ? Weight.calculatePlates(nextSet.weight, settings, nextSet.weight?.unit || settings.units, entry.exercise)
      : undefined;
    return {
      exerciseName: Exercise.fullName(exercise, settings),
      exerciseImageUrl: ExerciseImageUtils.url(exercise, "small", settings),
      currentSet: setIndex,
      totalSets: entry.sets.length,
      completedSets: entry.sets.map((s) => Reps.setsStatus([s])),
      targetReps: displaySet.reps,
      targetWeight: displaySet.weight || "",
      targetRPE: displaySet.rpe || "",
      targetTimer: displaySet.timer != null ? displaySet.timer.toString() : "",
      plates: plates ? Weight.formatOneSide(settings, plates.plates, entry.exercise) : undefined,
      currentWeight: displaySet.weight || "",
      currentReps: displaySet.reps,
      restTimerSince: progress.timerSince,
      restTimer: progress.timer,
      canCompleteFromLiveActivity: true,
    };
  }

  public static updateLiveActivity(progress: IHistoryRecord, entry: IHistoryEntry, settings: ISettings): void {
    const nextEntry = Progress.getNextEntry(progress, entry, "workout", true);
    const liveActivityEntry = nextEntry ? this.getLiveActivityEntry(progress, nextEntry, settings) : undefined;
    const attributes: ILiveActivityState = {
      isWorkoutComplete: Progress.isFullyEmptyOrFinishedSet(progress),
      workoutStartTimestamp: progress.startTime,
      historyEntryState: liveActivityEntry,
    };
    SendMessage.toIos({ type: "updateLiveActivity", data: JSON.stringify(attributes) });
  }
}
