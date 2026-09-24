import { ILiveActivityState } from "./liveActivityState";
import { SendMessage_toIosAndAndroid } from "./sendMessage";
import { INativeWorkoutBridgeLiveActivityAction, IWorkoutBridge } from "./workoutBridge";
import { ITimerBridge } from "./timerBridge";
import { IWorkoutMirroring } from "./workoutMirroring";

export type { INativeWorkoutBridgeLiveActivityAction } from "./workoutBridge";

export class WorkoutBridge implements IWorkoutBridge {
  constructor(_timer?: ITimerBridge, _mirroring?: IWorkoutMirroring) {}

  public pauseWorkout(): void {
    SendMessage_toIosAndAndroid({ type: "pauseWorkout" });
  }

  public resumeWorkout(opts: { reminder: number; isStart: boolean; hasSubscription: boolean }): void {
    SendMessage_toIosAndAndroid({
      type: "resumeWorkout",
      reminder: `${opts.reminder}`,
      isStart: opts.isStart ? "true" : "false",
      hasSubscription: opts.hasSubscription ? "true" : "false",
    });
  }

  public finishWorkout(opts: { healthSync: boolean; calories: number; intervals: string }): void {
    SendMessage_toIosAndAndroid({
      type: "finishWorkout",
      healthSync: opts.healthSync ? "true" : "false",
      calories: `${opts.calories}`,
      intervals: opts.intervals,
    });
  }

  public discardWorkout(): void {
    SendMessage_toIosAndAndroid({ type: "pauseWorkout" });
    SendMessage_toIosAndAndroid({ type: "discardWorkout" });
  }

  public updateLiveActivity(state: ILiveActivityState): void {
    SendMessage_toIosAndAndroid({ type: "updateLiveActivity", data: JSON.stringify(state) });
  }

  public subscribeToLiveActivityActions(_handler: (event: INativeWorkoutBridgeLiveActivityAction) => void): () => void {
    return () => {};
  }

  public dispose(): void {}
}
