import { IHistoryRecord, IWorkoutOutcome } from "../types";
import { IHealthWorkoutPayload } from "../utils/healthAdapter";
import { History_calories } from "./history";

const maxWorkoutOutcomes = 20;
const healthSaveMaxAgeMs = 24 * 60 * 60 * 1000;

export function WorkoutOutcome_add(
  outcomes: IWorkoutOutcome[] | undefined,
  outcome: Omit<IWorkoutOutcome, "vtype">
): IWorkoutOutcome[] {
  const others = (outcomes ?? []).filter((o) => o.id !== outcome.id);
  return [...others, { vtype: "workout_outcome" as const, ...outcome }]
    .sort((a, b) => a.endTime - b.endTime || a.id - b.id)
    .slice(-maxWorkoutOutcomes);
}

export function WorkoutOutcome_syncId(id: number): string {
  return `liftosaur-workout-${id}`;
}

export function WorkoutOutcome_healthSaves(
  oldOutcomes: IWorkoutOutcome[] | undefined,
  newOutcomes: IWorkoutOutcome[] | undefined,
  history: IHistoryRecord[],
  nowMs: number
): IHealthWorkoutPayload[] {
  const oldIds = new Set((oldOutcomes ?? []).map((o) => o.id));
  const payloads: IHealthWorkoutPayload[] = [];
  for (const outcome of newOutcomes ?? []) {
    if (
      oldIds.has(outcome.id) ||
      outcome.outcome !== "finish" ||
      !outcome.healthSync ||
      nowMs - outcome.endTime > healthSaveMaxAgeMs
    ) {
      continue;
    }
    const record = history.find((r) => r.id === outcome.id);
    if (record != null) {
      payloads.push(WorkoutOutcome_healthPayload(record));
    }
  }
  return payloads;
}

export function WorkoutOutcome_healthPayload(record: IHistoryRecord): IHealthWorkoutPayload {
  const intervals: [number, number | null][] = (record.intervals ?? []).map(([s, e]) => [s, e ?? null]);
  const closed = intervals.filter((i): i is [number, number] => i[1] != null);
  const startMs = closed[0]?.[0] ?? record.startTime;
  return {
    startMs,
    endMs: closed[closed.length - 1]?.[1] ?? record.endTime ?? startMs,
    calories: History_calories(record),
    intervals,
    syncId: WorkoutOutcome_syncId(record.id),
  };
}
