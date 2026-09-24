import { ITimerBridge } from "../utils/timerBridge";

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
  constructor(private readonly timer: ITimerBridge) {}

  public play(volume: number, vibration: boolean, sound: ISoundName = "notification"): void {
    if (volume <= 0 && !vibration) {
      return;
    }
    this.timer.playSound(volume, vibration, sound);
  }
}
