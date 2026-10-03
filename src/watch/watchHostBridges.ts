import { ILiveActivityState } from "../utils/liveActivityState";
import { INativeTimerStartParams, ITimerBridge } from "../utils/timerBridge";
import { INativeWorkoutBridgeLiveActivityAction, IWorkoutBridge } from "../utils/workoutBridge";
import { WatchHost_send } from "../utils/watchHost";

export class WatchHostTimerBridge implements ITimerBridge {
  public startTimer(params: INativeTimerStartParams): void {
    WatchHost_send({
      type: "startTimer",
      duration: params.duration.toString(),
      title: params.title,
      subtitleHeader: params.subtitleHeader,
      subtitle: params.subtitle,
      bodyHeader: params.bodyHeader,
      body: params.body,
      ignoreDoNotDisturb: params.ignoreDoNotDisturb ? "true" : "false",
      vibration: params.vibration ? "true" : "false",
      volume: params.volume.toString(),
      timerSinceMs: params.timerSinceMs.toString(),
      timerSeconds: params.timerSeconds.toString(),
    });
  }

  public stopTimer(): void {
    WatchHost_send({ type: "stopTimer" });
  }

  public playSound(): boolean {
    return false;
  }

  public subscribeOnScheduled(): () => void {
    return () => {};
  }

  public scheduleReminder(): void {}

  public cancelReminder(): void {}
}

export class WatchHostWorkoutBridge implements IWorkoutBridge {
  public pauseWorkout(): void {}

  public resumeWorkout(): void {}

  public finishWorkout(): void {}

  public discardWorkout(): void {}

  public updateLiveActivity(state: ILiveActivityState): void {
    WatchHost_send({ type: "updateLiveActivity", data: JSON.stringify(state) });
  }

  public subscribeToLiveActivityActions(_handler: (event: INativeWorkoutBridgeLiveActivityAction) => void): () => void {
    return () => {};
  }

  public dispose(): void {}
}
