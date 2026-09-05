import { NativeTimerBridge_playSound } from "../utils/nativeTimerBridge";

// Mirrors audioInterface.ts - see the note there on why this is a closed set.
export type ISoundName = "notification" | "set-timer-end" | "get-ready-end";

export interface IAudioInterface {
  play(volume: number, vibration: boolean, sound?: ISoundName): void;
}

export class MockAudioInterface implements IAudioInterface {
  public play(volume: number, vibration: boolean, sound?: ISoundName): void {
    // noop
  }
}

export class AudioInterface implements IAudioInterface {
  public play(volume: number, vibration: boolean, sound: ISoundName = "notification"): void {
    if (volume <= 0 && !vibration) {
      return;
    }
    NativeTimerBridge_playSound(volume, vibration, sound);
  }
}
