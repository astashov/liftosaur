import { Platform } from "react-native";
import { IDispatch } from "../ducks/types";
import { Thunk_finishProgramDay } from "../ducks/thunks";
import { Progress_isFullyEmptyOrFinishedSet } from "../models/progress";
import { IHistoryRecord, ISettings } from "../types";
import { HealthSync_eligibleForAppleHealth, HealthSync_eligibleForGoogleHealth } from "../lib/healthSync";
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

async function askHealthSync(settings: ISettings): Promise<boolean> {
  const isEligible =
    (HealthSync_eligibleForAppleHealth() && settings.appleHealthSyncWorkout) ||
    (HealthSync_eligibleForGoogleHealth() && settings.googleHealthSyncWorkout);
  if (!isEligible) {
    return false;
  }
  const healthName = Platform.OS === "ios" ? "Apple Health" : "Google Health";
  return !settings.healthConfirmation || Dialog_confirm(`Do you want to sync this workout to ${healthName}?`);
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
  const healthSync = isCurrent && (await askHealthSync(settings));
  setIsFinishing(true);
  try {
    await nextPaint();
    dispatch(
      Thunk_finishProgramDay({
        id: progress.id,
        startTime: progress.startTime,
        healthSync,
        onStale: () => setIsFinishing(false),
      })
    );
    // isFinishing stays true on success: Thunk_finishProgramDay defers the 1-2s blocking commit past
    // `await getNavigationService()` and navigates away first, so clearing here would drop the
    // spinner right before the freeze it masks.
  } catch (error) {
    setIsFinishing(false);
    throw error;
  }
}
