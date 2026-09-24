import { AppState, AppStateStatus, NativeEventSubscription } from "react-native";
import NativeLiftosaurLiveActivity from "../specs/NativeLiftosaurLiveActivity";
import { ILiveActivityState } from "./liveActivityState";
import { Analytics_trackFinishWorkout } from "./analytics";
import { ITimerBridge } from "./timerBridge";
import { IWorkoutMirroring } from "./workoutMirroring";
import { INativeWorkoutBridgeLiveActivityAction, IWorkoutBridge } from "./workoutBridge";

export type { INativeWorkoutBridgeLiveActivityAction } from "./workoutBridge";

export class WorkoutBridge implements IWorkoutBridge {
  private currentReminderDuration: number | null = null;
  private appStateSubscription: NativeEventSubscription | undefined = undefined;
  // Set while a "completeSet" action handler runs synchronously, so the single
  // updateLiveActivity it triggers carries the id back to native and acks the
  // exact render the waiting intent is blocked on.
  private pendingCompleteSetRequestId: string | null = null;

  constructor(
    private readonly timer: ITimerBridge,
    private readonly mirroring: IWorkoutMirroring
  ) {}

  private ensureAppStateSubscription(): void {
    if (this.appStateSubscription != null) {
      return;
    }
    this.appStateSubscription = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") {
        this.timer.cancelReminder();
      } else if (next === "background") {
        const duration = this.currentReminderDuration;
        if (duration != null && duration > 0) {
          this.timer.scheduleReminder(
            duration,
            "Workout reminder",
            "You have an ongoing workout, make sure to finish it if you're done"
          );
        }
      }
    });
  }

  public pauseWorkout(): void {
    NativeLiftosaurLiveActivity.endLiveActivity().catch(() => {});
    this.currentReminderDuration = null;
    this.timer.cancelReminder();
    this.mirroring.pauseWatchWorkout();
  }

  public resumeWorkout(opts: { reminder: number; isStart: boolean; hasSubscription: boolean }): void {
    this.ensureAppStateSubscription();
    this.currentReminderDuration = opts.reminder > 0 ? opts.reminder : null;
    if (opts.hasSubscription) {
      if (opts.isStart) {
        this.mirroring.startWatchWorkout().catch(() => {});
      } else {
        this.mirroring.resumeWatchWorkout();
      }
    }
  }

  public finishWorkout(_opts: { healthSync: boolean; calories: number; intervals: string }): void {
    NativeLiftosaurLiveActivity.endLiveActivity().catch(() => {});
    this.currentReminderDuration = null;
    this.timer.cancelReminder();
    Analytics_trackFinishWorkout();
  }

  public discardWorkout(): void {
    NativeLiftosaurLiveActivity.endLiveActivity().catch(() => {});
    this.currentReminderDuration = null;
    this.timer.cancelReminder();
    this.timer.stopTimer();
  }

  public updateLiveActivity(state: ILiveActivityState): void {
    NativeLiftosaurLiveActivity.updateLiveActivity({
      workoutStartTimestamp: state.workoutStartTimestamp,
      ignoreDoNotDisturb: state.ignoreDoNotDisturb,
      rest: state.restTimer,
      entry: state.historyEntryState,
      completeSetRequestId: this.pendingCompleteSetRequestId ?? undefined,
      setTimer: state.setTimer,
      getReady: state.getReady,
    }).catch(() => {});
  }

  public subscribeToLiveActivityActions(handler: (event: INativeWorkoutBridgeLiveActivityAction) => void): () => void {
    const subscription = NativeLiftosaurLiveActivity.onLiveActivityAction((event) => {
      if (
        (event.action === "completeSet" || event.action === "recordSetTimer" || event.action === "startSetTimerWork") &&
        event.completeSetRequestId != null
      ) {
        this.pendingCompleteSetRequestId = event.completeSetRequestId;
      }
      try {
        handler(event);
      } finally {
        this.pendingCompleteSetRequestId = null;
      }
    });
    NativeLiftosaurLiveActivity.flushPendingActions().catch(() => {});
    return () => subscription.remove();
  }

  public dispose(): void {
    this.appStateSubscription?.remove();
    this.appStateSubscription = undefined;
  }
}
