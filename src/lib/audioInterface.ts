export interface IAudioInterface {
  play(): void;
}

export class MockAudioInterface implements IAudioInterface {
  public play(): void {
    // noop
  }
}

export class AudioInterface implements IAudioInterface {
  private readonly audio: HTMLAudioElement;

  constructor() {
    this.audio = new Audio("/notification.m4r");
  }

  public play(): void {
    this.audio.play();
  }
}
