import { AppState, AppStateStatus } from "react-native";
import NativeLiftosaurLiveActivity, { LiveActivityActionEvent } from "../specs/NativeLiftosaurLiveActivity";
import NativeLiftosaurTimer from "../specs/NativeLiftosaurTimer";
import { ILiveActivityState } from "./liveActivityManager";
import { Analytics_trackFinishWorkout } from "./analytics";
import {
  NativeWorkoutMirroring_startWatchWorkout,
  NativeWorkoutMirroring_pauseWatchWorkout,
  NativeWorkoutMirroring_resumeWatchWorkout,
} from "./nativeWorkoutMirroringBridge";

export type INativeWorkoutBridgeLiveActivityAction = LiveActivityActionEvent;

let currentReminderDuration: number | null = null;
let appStateSubscribed = false;

function ensureAppStateSubscription(): void {
  if (appStateSubscribed) {
    return;
  }
  appStateSubscribed = true;
  AppState.addEventListener("change", (next: AppStateStatus) => {
    if (next === "active") {
      NativeLiftosaurTimer.cancelReminder().catch(() => {});
    } else if (next === "background") {
      const duration = currentReminderDuration;
      if (duration != null && duration > 0) {
        NativeLiftosaurTimer.scheduleReminder(
          duration,
          "Workout reminder",
          "You have an ongoing workout, make sure to finish it if you're done"
        ).catch(() => {});
      }
    }
  });
}

export function NativeWorkoutBridge_pauseWorkout(): void {
  NativeLiftosaurLiveActivity.endLiveActivity().catch(() => {});
  currentReminderDuration = null;
  NativeLiftosaurTimer.cancelReminder().catch(() => {});
  NativeWorkoutMirroring_pauseWatchWorkout();
}

export function NativeWorkoutBridge_resumeWorkout(opts: {
  reminder: number;
  isStart: boolean;
  hasSubscription: boolean;
}): void {
  ensureAppStateSubscription();
  currentReminderDuration = opts.reminder > 0 ? opts.reminder : null;
  if (opts.hasSubscription) {
    if (opts.isStart) {
      NativeWorkoutMirroring_startWatchWorkout().catch(() => {});
    } else {
      NativeWorkoutMirroring_resumeWatchWorkout();
    }
  }
}

export function NativeWorkoutBridge_finishWorkout(_opts: {
  healthSync: boolean;
  calories: number;
  intervals: string;
}): void {
  NativeLiftosaurLiveActivity.endLiveActivity().catch(() => {});
  currentReminderDuration = null;
  NativeLiftosaurTimer.cancelReminder().catch(() => {});
  Analytics_trackFinishWorkout();
}

export function NativeWorkoutBridge_discardWorkout(): void {
  NativeLiftosaurLiveActivity.endLiveActivity().catch(() => {});
  currentReminderDuration = null;
  NativeLiftosaurTimer.cancelReminder().catch(() => {});
  NativeLiftosaurTimer.stopTimer().catch(() => {});
}

export function NativeWorkoutBridge_updateLiveActivity(state: ILiveActivityState): void {
  NativeLiftosaurLiveActivity.updateLiveActivity({
    workoutStartTimestamp: state.workoutStartTimestamp,
    ignoreDoNotDisturb: state.ignoreDoNotDisturb,
    rest: state.restTimer,
    entry: state.historyEntryState,
  }).catch(() => {});
}

export function NativeWorkoutBridge_subscribeToLiveActivityActions(
  handler: (event: LiveActivityActionEvent) => void
): () => void {
  const subscription = NativeLiftosaurLiveActivity.onLiveActivityAction(handler);
  NativeLiftosaurLiveActivity.flushPendingActions().catch(() => {});
  return () => subscription.remove();
}
