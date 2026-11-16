import { INativeTimerStartParams, INotificationPermission, ITimerBridge } from "./timerBridge";

export type { INativeTimerStartParams } from "./timerBridge";

export class TimerBridge implements ITimerBridge {
  public async getNotificationPermission(): Promise<INotificationPermission> {
    return "unavailable";
  }

  public async requestNotificationPermission(): Promise<INotificationPermission> {
    return "unavailable";
  }

  public startTimer(_params: INativeTimerStartParams): void {}

  public stopTimer(): void {}

  public playSound(_volume: number, _vibration: boolean, _sound: string): boolean {
    return false;
  }

  public subscribeOnScheduled(_handler: () => void): () => void {
    return () => {};
  }

  public scheduleReminder(_duration: number, _title: string, _body: string): void {}

  public cancelReminder(): void {}
}
