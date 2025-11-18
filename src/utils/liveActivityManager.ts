import { Exercise } from "../models/exercise";
import { ExerciseImageUtils } from "../models/exerciseImage";
import { IEvaluatedProgram, Program } from "../models/program";
import { ProgramExercise } from "../models/programExercise";
import { Progress } from "../models/progress";
import { ISetsStatus, Reps } from "../models/set";
import { Weight } from "../models/weight";
import { IHistoryEntry, IHistoryRecord, ISettings, ISubscription } from "../types";
import { n } from "./math";
import { SendMessage } from "./sendMessage";
import { Subscriptions } from "./subscriptions";
import { UrlUtils } from "./url";

declare const __HOST__: string;

interface ILiveActivityEntry {
  exerciseName: string;
  currentSet: number;
  totalSets: number;
  completedSets: ISetsStatus[];
  canCompleteFromLiveActivity: boolean;
  isWarmup: boolean;

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
    entry: IHistoryEntry,
    settings: ISettings,
    program?: IEvaluatedProgram
  ): ILiveActivityEntry | undefined {
    const exercise = Exercise.get(entry.exercise, settings.exercises);
    const allSets = [...entry.warmupSets, ...entry.sets];
    const setIndex = Reps.findNextSetIndex(entry);
    const nextSet = Reps.findNextSet(entry);
    if (setIndex === -1 || !nextSet) {
      return undefined;
    }
    const isNextSetWarmup = setIndex < entry.warmupSets.length;
    const plates = nextSet.weight
      ? Weight.calculatePlates(nextSet.weight, settings, nextSet.weight?.unit || settings.units, entry.exercise)
      : undefined;
    let exerciseImageUrl = ExerciseImageUtils.url(exercise, "small", settings);
    if (exerciseImageUrl) {
      exerciseImageUrl = UrlUtils.build(exerciseImageUrl, __HOST__)?.toString();
    }
    const programExercise = program
      ? Program.getProgramExercise(progress.day, program, entry.programExerciseId)
      : undefined;
    const hasUserPromptedVars = !!(programExercise && ProgramExercise.hasUserPromptedVars(programExercise));
    const canCompleteFromLiveActivity = !Progress.shouldShowAmrapModal(
      entry,
      isNextSetWarmup ? setIndex : setIndex - entry.warmupSets.length,
      isNextSetWarmup ? "warmup" : "workout",
      hasUserPromptedVars,
      settings
    );

    const currentReps = nextSet.completedReps ?? nextSet.reps;
    const currentWeight = nextSet.completedWeight ?? nextSet.weight;
    const state: ILiveActivityEntry = {
      exerciseName: Exercise.fullName(exercise, settings),
      exerciseImageUrl,
      currentSet: setIndex + 1,
      totalSets: allSets.length,
      completedSets: allSets.map((s) => Reps.setsStatus([s])),
      targetReps: nextSet.reps ? `${n(nextSet.reps)}${nextSet.isAmrap ? "+" : ""}` : undefined,
      targetWeight: nextSet.weight ? `${Weight.print(nextSet.weight)}${nextSet.askWeight ? "+" : ""}` : undefined,
      targetRPE: nextSet.rpe != null ? `${n(nextSet.rpe)}${nextSet.logRpe ? "+" : ""}` : undefined,
      targetTimer: nextSet.timer != null ? nextSet.timer.toString() : undefined,
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
    entry: IHistoryEntry,
    settings: ISettings,
    subscription?: ISubscription
  ): void {
    if (!subscription || !Subscriptions.hasSubscription(subscription)) {
      return;
    }
    const nextEntry = Progress.getNextEntry(progress, entry, "workout", true);
    const liveActivityEntry = nextEntry ? this.getLiveActivityEntry(progress, nextEntry, settings) : undefined;
    const attributes: ILiveActivityState = {
      workoutStartTimestamp: progress.startTime,
      historyEntryState: liveActivityEntry,
      restTimer:
        progress.timerSince != null && progress.timer != null
          ? {
              restTimerSince: progress.timerSince,
              restTimer: progress.timer,
            }
          : undefined,
    };
    console.log(attributes);
    SendMessage.toIos({ type: "updateLiveActivity", data: JSON.stringify(attributes) });
  }
}
