import { NativeTimerBridge_playSound } from "../utils/nativeTimerBridge";

export interface IAudioInterface {
  play(volume: number, vibration: boolean, sound?: string): void;
}

export class MockAudioInterface implements IAudioInterface {
  public play(volume: number, vibration: boolean, sound?: string): void {
    // noop
  }
}

export class AudioInterface implements IAudioInterface {
  public play(volume: number, vibration: boolean, sound: string = "notification"): void {
    if (volume <= 0 && !vibration) {
      return;
    }
    NativeTimerBridge_playSound(volume, vibration, sound);
  }
}
