import { SendMessage } from "../utils/sendMessage";

export interface IAudioInterface {
  play(volume: number, vibration: boolean): void;
}

export class MockAudioInterface implements IAudioInterface {
  public play(volume: number, vibration: boolean): void {
    // noop
  }
}

export class AudioInterface implements IAudioInterface {
  private audio?: HTMLAudioElement;

  constructor() {}

  public play(volume: number, vibration: boolean): void {
    const isPlayed =
      SendMessage.toIos({ type: "playSound", volume: `${volume}`, vibration: vibration ? "true" : "false" }) ||
      SendMessage.toAndroid({ type: "playSound", volume: `${volume}`, vibration: vibration ? "true" : "false" });
    if (!isPlayed) {
      if (this.audio == null) {
        this.audio = new Audio("/notification.m4r");
      }
      this.audio.play();
    }
  }
}
