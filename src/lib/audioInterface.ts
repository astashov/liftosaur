import { SendMessage_toIos, SendMessage_toAndroid } from "../utils/sendMessage";

export interface IAudioInterface {
  play(volume: number, vibration: boolean): void;
}

export class MockAudioInterface implements IAudioInterface {
  public play(volume: number, vibration: boolean): void {
    // noop
  }
}

export class AudioInterface implements IAudioInterface {
  private readonly audio: HTMLAudioElement;

  constructor() {
    this.audio = new Audio("/notification.m4r");
  }

  public play(volume: number, vibration: boolean): void {
    const isPlayed =
      SendMessage_toIos({ type: "playSound", volume: `${volume}`, vibration: vibration ? "true" : "false" }) ||
      SendMessage_toAndroid({ type: "playSound", volume: `${volume}`, vibration: vibration ? "true" : "false" });
    if (!isPlayed) {
      this.audio.play();
    }
  }
}
