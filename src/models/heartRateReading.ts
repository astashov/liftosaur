import { IHeartRateSource, INativeWorkoutMirroringEvent, IRawWorkoutMirroringEvent } from "../utils/workoutMirroring";

export const HeartRateReading_staleAfterMs = 15000;

export interface IHeartRateReading {
  bpm: number;
  measuredAt: number;
  source: IHeartRateSource;
}

function parseSource(source: string | undefined): IHeartRateSource | undefined {
  return source === "watch" || source === "phone" ? source : undefined;
}

export function HeartRateReading_parseEvent(raw: IRawWorkoutMirroringEvent): INativeWorkoutMirroringEvent | undefined {
  if (raw.type === "source") {
    return { type: "source", source: parseSource(raw.source) };
  }
  if (raw.type === "heartRate") {
    const source = parseSource(raw.source);
    const bpm = raw.heartRate;
    const measuredAt = raw.measuredAt;
    if (source == null || bpm == null || measuredAt == null || !isFinite(bpm) || bpm <= 0) {
      return undefined;
    }
    return { type: "heartRate", bpm: Math.round(bpm), measuredAt, source };
  }
  return undefined;
}

export function HeartRateReading_apply(
  prev: IHeartRateReading | undefined,
  event: INativeWorkoutMirroringEvent
): IHeartRateReading | undefined {
  if (event.type === "source") {
    return prev != null && prev.source === event.source ? prev : undefined;
  }
  if (prev != null && prev.source === event.source && event.measuredAt <= prev.measuredAt) {
    return prev;
  }
  return { bpm: event.bpm, measuredAt: event.measuredAt, source: event.source };
}

export function HeartRateReading_expiresAt(reading: IHeartRateReading | undefined): number | undefined {
  return reading != null ? reading.measuredAt + HeartRateReading_staleAfterMs : undefined;
}

export function HeartRateReading_visibleBpm(reading: IHeartRateReading | undefined, now: number): number | undefined {
  const expiresAt = HeartRateReading_expiresAt(reading);
  return reading != null && expiresAt != null && now < expiresAt ? reading.bpm : undefined;
}
