import { ILiveActivityState } from "../utils/liveActivityState";
import { INativeTimerStartParams, ITimerBridge } from "../utils/timerBridge";
import { IWatchBridge } from "../utils/watchBridge";
import { IWorkoutBridge } from "../utils/workoutBridge";
import { IWorkoutMirroring } from "../utils/workoutMirroring";

export type INativeEffect =
  | { type: "startTimer"; params: INativeTimerStartParams }
  | { type: "stopTimer" }
  | { type: "updateLiveActivity"; state: ILiveActivityState }
  | { type: "resumeWorkout"; reminder: number; isStart: boolean; hasSubscription: boolean }
  | { type: "pauseWorkout" }
  | { type: "discardWorkout" }
  | { type: "sendDiscardWorkoutToWatch" }
  | { type: "resetWatchWorkoutState" };

export interface INativeEffectBridges {
  timer: ITimerBridge;
  workout: IWorkoutBridge;
  watch: IWatchBridge;
  mirroring: IWorkoutMirroring;
}

export function NativeEffects_apply(bridges: INativeEffectBridges, effects: readonly INativeEffect[]): void {
  for (const effect of effects) {
    switch (effect.type) {
      case "startTimer":
        bridges.timer.startTimer(effect.params);
        break;
      case "stopTimer":
        bridges.timer.stopTimer();
        break;
      case "updateLiveActivity":
        bridges.workout.updateLiveActivity(effect.state);
        break;
      case "resumeWorkout":
        bridges.workout.resumeWorkout({
          reminder: effect.reminder,
          isStart: effect.isStart,
          hasSubscription: effect.hasSubscription,
        });
        break;
      case "pauseWorkout":
        bridges.workout.pauseWorkout();
        break;
      case "discardWorkout":
        bridges.workout.discardWorkout();
        break;
      case "sendDiscardWorkoutToWatch":
        bridges.watch.sendDiscardWorkoutToWatch();
        break;
      case "resetWatchWorkoutState":
        bridges.mirroring.resetWatchWorkoutState();
        break;
      default:
        exhausted(effect);
    }
  }
}

function exhausted(effect: never): never {
  throw new Error(`Unhandled native effect: ${JSON.stringify(effect)}`);
}
