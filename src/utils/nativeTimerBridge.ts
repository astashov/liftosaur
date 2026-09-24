import { SendMessage_toAndroid, SendMessage_toIos } from "./sendMessage";
import { INativeTimerStartParams, ITimerBridge } from "./timerBridge";

export type { INativeTimerStartParams } from "./timerBridge";

export class TimerBridge implements ITimerBridge {
  public startTimer(params: INativeTimerStartParams): void {
    const obj = {
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
    };
    SendMessage_toIos(obj);
    SendMessage_toAndroid(obj);
  }

  public stopTimer(): void {
    SendMessage_toIos({ type: "stopTimer" });
    SendMessage_toAndroid({ type: "stopTimer" });
  }

  public playSound(volume: number, vibration: boolean, sound: string): boolean {
    return (
      SendMessage_toIos({ type: "playSound", volume: `${volume}`, vibration: vibration ? "true" : "false", sound }) ||
      SendMessage_toAndroid({ type: "playSound", volume: `${volume}`, vibration: vibration ? "true" : "false", sound })
    );
  }

  public subscribeOnScheduled(_handler: () => void): () => void {
    return () => {};
  }

  public scheduleReminder(_duration: number, _title: string, _body: string): void {
    return;
  }

  public cancelReminder(): void {
    return;
  }
}
