import { NativeTimerBridge_playSound } from "../utils/nativeTimerBridge";

export interface IAudioInterface {
  play(volume: number, vibration: boolean): void;
}

export class MockAudioInterface implements IAudioInterface {
  public play(volume: number, vibration: boolean): void {
    // noop
  }
}

export class AudioInterface implements IAudioInterface {
  public play(volume: number, vibration: boolean): void {
    if (volume <= 0 && !vibration) return;
    NativeTimerBridge_playSound(volume, vibration);
  }
}
