import NativeLiftosaurTimer from "../specs/NativeLiftosaurTimer";
import { INativeTimerStartParams, ITimerBridge } from "./timerBridge";

export type { INativeTimerStartParams } from "./timerBridge";

export class TimerBridge implements ITimerBridge {
  private readonly scheduledHandlers = new Set<() => void>();

  public startTimer(params: INativeTimerStartParams): void {
    NativeLiftosaurTimer.startTimer(params)
      .then((result) => {
        if (result?.scheduled) {
          this.scheduledHandlers.forEach((h) => h());
        }
      })
      .catch((e) => {
        console.warn("NativeLiftosaurTimer.startTimer failed", e);
      });
  }

  public stopTimer(): void {
    NativeLiftosaurTimer.stopTimer().catch(() => {});
  }

  public playSound(volume: number, vibration: boolean, sound: string): boolean {
    NativeLiftosaurTimer.playSound(volume, vibration, sound).catch(() => {});
    return true;
  }

  public subscribeOnScheduled(handler: () => void): () => void {
    this.scheduledHandlers.add(handler);
    return () => {
      this.scheduledHandlers.delete(handler);
    };
  }

  public scheduleReminder(duration: number, title: string, body: string): void {
    NativeLiftosaurTimer.scheduleReminder(duration, title, body).catch(() => {});
  }

  public cancelReminder(): void {
    NativeLiftosaurTimer.cancelReminder().catch(() => {});
  }
}
