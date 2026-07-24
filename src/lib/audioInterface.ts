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
  private readonly audios: Record<string, HTMLAudioElement> = {};

  private getAudio(sound: string): HTMLAudioElement {
    if (this.audios[sound] == null) {
      this.audios[sound] = new Audio(`/${sound}.m4r`);
    }
    return this.audios[sound];
  }

  public play(volume: number, vibration: boolean, sound: string = "notification"): void {
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
