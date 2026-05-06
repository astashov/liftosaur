import NativeLiftosaurTimer from "../specs/NativeLiftosaurTimer";

export type NativeTimerStartParams = {
  duration: number;
  title: string;
  subtitleHeader: string;
  subtitle: string;
  bodyHeader: string;
  body: string;
  volume: number;
  vibration: boolean;
  ignoreDoNotDisturb: boolean;
};

const scheduledHandlers = new Set<() => void>();

export function NativeTimerBridge_startTimer(params: NativeTimerStartParams): void {
  void NativeLiftosaurTimer.startTimer(params)
    .then((result) => {
      if (result?.scheduled) {
        scheduledHandlers.forEach((h) => h());
      }
    })
    .catch((e) => {
      console.warn("NativeLiftosaurTimer.startTimer failed", e);
    });
}

export function NativeTimerBridge_stopTimer(): void {
  void NativeLiftosaurTimer.stopTimer().catch(() => {});
}

export function NativeTimerBridge_playSound(volume: number, vibration: boolean): boolean {
  void NativeLiftosaurTimer.playSound(volume, vibration).catch(() => {});
  return true;
}

export function NativeTimerBridge_subscribeOnScheduled(handler: () => void): () => void {
  scheduledHandlers.add(handler);
  return () => {
    scheduledHandlers.delete(handler);
  };
}
