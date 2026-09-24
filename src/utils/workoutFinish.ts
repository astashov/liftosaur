import { Platform } from "react-native";
import { IDispatch } from "../ducks/types";
import {
  Thunk_finishProgramDay,
  Thunk_finishWorkoutNative,
  Thunk_pauseWorkoutNative,
  Thunk_postevent,
  Thunk_saveWorkoutToHealth,
} from "../ducks/thunks";
import { History_calories, History_pauseWorkout } from "../models/history";
import { Progress_isFullyEmptyOrFinishedSet } from "../models/progress";
import { IHistoryRecord, ISettings } from "../types";
import { HealthSync_eligibleForAppleHealth, HealthSync_eligibleForGoogleHealth } from "../lib/healthSync";
import { SendMessage_isIos } from "./sendMessage";
import { Dialog_confirm } from "./dialog";

export interface IWorkoutFinishArgs {
  progress: IHistoryRecord;
  settings: ISettings;
  dispatch: IDispatch;
  isCurrent: boolean;
  setIsFinishing: (value: boolean) => void;
}

function nextPaint(): Promise<void> {
  return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

export async function WorkoutFinish_run(args: IWorkoutFinishArgs): Promise<void> {
  const { progress, settings, dispatch, isCurrent, setIsFinishing } = args;
  const isFullyFinished = isCurrent && Progress_isFullyEmptyOrFinishedSet(progress);
  if (!isFullyFinished) {
    const confirmed = await Dialog_confirm(
      isCurrent
        ? "Are you sure you want to FINISH this workout? Some sets are not marked as completed."
        : "Are you sure you want to SAVE this PAST workout?"
    );
    if (!confirmed) {
      return;
    }
  }
  setIsFinishing(true);
  try {
    await nextPaint();
    dispatch(Thunk_pauseWorkoutNative());
    dispatch(Thunk_finishProgramDay(progress.id));
    if (isCurrent) {
      dispatch(Thunk_postevent("finish-workout", { workout: JSON.stringify(progress) }));
      const isIos = Platform.OS === "ios" || SendMessage_isIos();
      const healthName = isIos ? "Apple Health" : "Google Health";
      const isHealthEligible =
        (HealthSync_eligibleForAppleHealth() && settings.appleHealthSyncWorkout) ||
        (HealthSync_eligibleForGoogleHealth() && settings.googleHealthSyncWorkout);
      const shouldSyncToHealth =
        isHealthEligible &&
        (!settings.healthConfirmation || (await Dialog_confirm(`Do you want to sync this workout to ${healthName}?`)));
      const rawIntervals = History_pauseWorkout(progress.intervals) ?? [];
      const intervals: [number, number | null][] = rawIntervals.map(([s, e]) => [s, e ?? null]);
      dispatch(
        Thunk_finishWorkoutNative({
          progress,
          shouldSyncToHealth: !!shouldSyncToHealth,
          intervals,
          onDone: (watchSaved) => {
            if (shouldSyncToHealth && !watchSaved) {
              const validIntervals = intervals.filter((i): i is [number, number] => i[1] != null);
              const startMs = validIntervals[0]?.[0] ?? progress.startTime;
              const endMs = validIntervals[validIntervals.length - 1]?.[1] ?? Date.now();
              dispatch(
                Thunk_saveWorkoutToHealth({
                  startMs,
                  endMs,
                  calories: History_calories(progress),
                  intervals,
                })
              );
            } else if (watchSaved) {
              dispatch(Thunk_postevent("skipped-phone-health-sync-watch-saved"));
            }
          },
        })
      );
    }
    // isFinishing stays true on success: Thunk_finishProgramDay defers the 1-2s blocking commit past
    // `await getNavigationService()` and navigates away first, so clearing here would drop the
    // spinner right before the freeze it masks.
  } catch (error) {
    setIsFinishing(false);
    throw error;
  }
}
