export class AudioInterface {
  private timerId?: number;

  public playNotificationIn(seconds: number): void {
    const audio = new Audio("/notification.m4r");
    if (this.timerId != null) {
      window.clearInterval(this.timerId);
    }
    this.timerId = window.setTimeout(() => {
      audio.play();
    }, seconds);
  }
}
