import { IHistoryRecord } from "../types";
import { IDesiredWorkout } from "../utils/workoutMirroring";
import { History_isPaused } from "./history";
import { Progress_isCurrent } from "./progress";

export function DesiredHeartRateWorkout_fromProgress(
  progress: IHistoryRecord | undefined,
  hasSubscription: boolean
): IDesiredWorkout {
  if (progress == null || !Progress_isCurrent(progress)) {
    return { workoutId: undefined, status: "none", expectWatch: false };
  }
  return {
    workoutId: progress.startTime,
    status: History_isPaused(progress.intervals) ? "paused" : "running",
    expectWatch: hasSubscription,
  };
}
