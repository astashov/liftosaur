export class AudioInterface {
  private readonly audio: HTMLAudioElement;

  constructor() {
    this.audio = new Audio("/notification.m4r");
  }

  public play(): void {
    this.audio.play();
  }
}
