export interface IRestTimerProgress {
  elapsedMs: number;
  remainingMs: number;
  fraction: number;
  isTimeOut: boolean;
}

export function RestTimerProgress_at(timerSince: number, timerSeconds: number, now: number): IRestTimerProgress {
  const totalMs = timerSeconds * 1000;
  const elapsedMs = Math.max(0, now - timerSince);
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const fraction = totalMs <= 0 ? 1 : Math.min(1, elapsedMs / totalMs);
  return { elapsedMs, remainingMs, fraction, isTimeOut: elapsedMs > totalMs };
}
