export type INativeTimerStartParams = {
  duration: number;
  title: string;
  subtitleHeader: string;
  subtitle: string;
  bodyHeader: string;
  body: string;
  volume: number;
  vibration: boolean;
  ignoreDoNotDisturb: boolean;
  timerSinceMs: number;
  timerSeconds: number;
};

export interface ITimerBridge {
  startTimer(params: INativeTimerStartParams): void;
  stopTimer(): void;
  playSound(volume: number, vibration: boolean, sound: string): boolean;
  subscribeOnScheduled(handler: () => void): () => void;
  scheduleReminder(duration: number, title: string, body: string): void;
  cancelReminder(): void;
}
