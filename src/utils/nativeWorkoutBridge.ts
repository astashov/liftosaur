import { ILiveActivityState } from "./liveActivityState";
import { INativeWorkoutBridgeLiveActivityAction, IWorkoutBridge } from "./workoutBridge";
import { ITimerBridge } from "./timerBridge";

export type { INativeWorkoutBridgeLiveActivityAction } from "./workoutBridge";

export class WorkoutBridge implements IWorkoutBridge {
  constructor(_timer?: ITimerBridge) {}

  public pauseWorkout(): void {}

  public resumeWorkout(_opts: { reminder: number; isStart: boolean; hasSubscription: boolean }): void {}

  public finishWorkout(_opts: { healthSync: boolean; calories: number; intervals: string }): void {}

  public discardWorkout(): void {}

  public updateLiveActivity(_state: ILiveActivityState): void {}

  public subscribeToLiveActivityActions(_handler: (event: INativeWorkoutBridgeLiveActivityAction) => void): () => void {
    return () => {};
  }

  public dispose(): void {}
}
