import { NativeTimerBridge_playSound } from "../utils/nativeTimerBridge";

// Closed set, because every platform resolves these names separately - web by filename, iOS by bundle
// resource, Android by a `when` over R.raw. An unmapped name doesn't fail there, it plays the wrong sound.
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
  private readonly audios: Record<string, HTMLAudioElement> = {};

  private getAudio(sound: ISoundName): HTMLAudioElement {
    if (this.audios[sound] == null) {
      this.audios[sound] = new Audio(`/${sound}.m4r`);
    }
    return this.audios[sound];
  }

  public play(volume: number, vibration: boolean, sound: ISoundName = "notification"): void {
    if (volume <= 0 && !vibration) {
      return;
    }
    const isPlayed = NativeTimerBridge_playSound(volume, vibration, sound);
    if (!isPlayed && volume > 0) {
      const audio = this.getAudio(sound);
      audio.volume = volume;
      audio.play();
    }
  }
}
