import { IHealthDailyMetric, IHealthDailyValue } from "./healthAdapter";

export interface IHealthDailySample {
  timestamp: number;
  value: number;
}

export interface IHealthDailyInterval {
  start: number;
  end: number;
}

// Merge overlapping asleep intervals before summing so sleep recorded by multiple sources (e.g. Apple
// Watch + Oura/AutoSleep, or several Health Connect apps) isn't double-counted. Each merged interval's
// duration is bucketed into the local day it ended on (the wake day).
export function HealthDaily_sleepMinutesByDay(intervals: IHealthDailyInterval[]): Map<number, number> {
  const sorted = intervals.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const merged: IHealthDailyInterval[] = [];
  for (const iv of sorted) {
    const last = merged[merged.length - 1];
    if (last != null && iv.start <= last.end) {
      last.end = Math.max(last.end, iv.end);
    } else {
      merged.push({ start: iv.start, end: iv.end });
    }
  }
  const byDay = new Map<number, number>();
  for (const iv of merged) {
    const day = HealthDaily_localDayStartMs(iv.end);
    byDay.set(day, (byDay.get(day) ?? 0) + (iv.end - iv.start) / 60000);
  }
  return byDay;
}

export function HealthDaily_localDayStartMs(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Start of the rolling read window, aligned to local midnight. Starting mid-day would read the oldest
// day only from the current time onward, producing a partial total that overwrites a complete one.
export function HealthDaily_windowStartMs(nowMs: number, windowDays: number): number {
  return HealthDaily_localDayStartMs(nowMs - windowDays * 24 * 60 * 60 * 1000);
}

export function HealthDaily_dayKey(dayStartMs: number): string {
  const d = new Date(dayStartMs);
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function HealthDaily_sumByDay(samples: IHealthDailySample[]): Map<number, number> {
  const byDay = new Map<number, number>();
  for (const sample of samples) {
    if (!(sample.value > 0)) {
      continue;
    }
    const day = HealthDaily_localDayStartMs(sample.timestamp);
    byDay.set(day, (byDay.get(day) ?? 0) + sample.value);
  }
  return byDay;
}

function roundForMetric(type: IHealthDailyMetric, value: number): number {
  return type === "protein" ? Math.round(value * 10) / 10 : Math.round(value);
}

export function HealthDaily_buildValues(type: IHealthDailyMetric, byDay: Map<number, number>): IHealthDailyValue[] {
  const values: IHealthDailyValue[] = [];
  for (const [dayStartMs, sum] of byDay) {
    values.push({
      type,
      timestamp: dayStartMs,
      value: roundForMetric(type, sum),
      uuid: `${type}-${HealthDaily_dayKey(dayStartMs)}`,
    });
  }
  return values;
}
