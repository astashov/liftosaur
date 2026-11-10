import { Exercise_findById } from "../models/exercise";
import { Length_convertTo } from "../models/length";
import { PlannerKey_fromExerciseType } from "../pages/planner/plannerKey";
import {
  IAllCustomExercises,
  IHistoryEntry,
  IHistoryRecord,
  IStats,
  IStatsHealthKey,
  IStatsKey,
  ISettings,
  IWeight,
  statsHealthDef,
  statsLengthDef,
  statsPercentageDef,
  statsWeightDef,
} from "../types";

export type ILiftographStatsKey = IStatsKey | IStatsHealthKey;

export const LiftographRows_statsKeys: readonly ILiftographStatsKey[] = [
  ...statsWeightDef,
  ...statsLengthDef,
  ...statsPercentageDef,
  ...statsHealthDef,
];

export function LiftographRows_isStatsKey(key: string): key is ILiftographStatsKey {
  return LiftographRows_statsKeys.some((k) => k === key);
}

const MINUTES_PER_HOUR = 60;

export type ILiftographSource =
  | {
      type: "exercise";
      exerciseId?: string;
      equipment?: string;
      label?: string;
      program?: string;
      day?: string | number;
    }
  | { type: "workout"; program?: string; day?: string | number }
  | { type: "stats"; key: ILiftographStatsKey };

export type ILiftographRow =
  | { type: "exercise"; id: string; ts: number; record: IHistoryRecord; entry: IHistoryEntry }
  | { type: "workout"; id: string; ts: number; record: IHistoryRecord }
  | { type: "stats"; id: string; ts: number; value: number | IWeight };

function sameText(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function matchesWorkout(record: IHistoryRecord, filter: { program?: string; day?: string | number }): boolean {
  if (filter.program != null && !sameText(record.programName, filter.program)) {
    return false;
  }
  if (filter.day != null) {
    return typeof filter.day === "number" ? record.day === filter.day : sameText(record.dayName, filter.day);
  }
  return true;
}

function exerciseDefaultEquipment(
  exerciseId: string | undefined,
  customExercises: IAllCustomExercises
): string | undefined {
  return exerciseId != null ? Exercise_findById(exerciseId, customExercises)?.defaultEquipment : undefined;
}

function matchesEntry(
  entry: IHistoryEntry,
  source: Extract<ILiftographSource, { type: "exercise" }>,
  defaultEquipment: string | undefined
): boolean {
  if (source.exerciseId != null) {
    if (entry.exercise.id !== source.exerciseId) {
      return false;
    }
    if ((entry.exercise.equipment ?? defaultEquipment) !== (source.equipment ?? defaultEquipment)) {
      return false;
    }
  }
  if (source.label != null) {
    return entry.programExerciseId === PlannerKey_fromExerciseType(entry.exercise, source.label);
  }
  return true;
}

export function LiftographRows_finished(history: IHistoryRecord[]): IHistoryRecord[] {
  return history
    .filter((record) => record.vtype === "history_record" && record.endTime != null)
    .sort((a, b) => a.startTime - b.startTime || a.id - b.id);
}

function statsRows(key: ILiftographStatsKey, stats: IStats, settings: ISettings): ILiftographRow[] {
  const rows: ILiftographRow[] = [];
  const healthKey = statsHealthDef.find((k) => k === key);
  if (healthKey != null) {
    for (const stat of stats.health?.[healthKey] ?? []) {
      if (!stat.hidden) {
        const value = healthKey === "sleep" ? stat.value / MINUTES_PER_HOUR : stat.value;
        rows.push({ type: "stats", id: `stat:${key}:${stat.timestamp}`, ts: stat.timestamp, value });
      }
    }
  } else if (key === "weight") {
    for (const stat of stats.weight.weight ?? []) {
      rows.push({ type: "stats", id: `stat:${key}:${stat.timestamp}`, ts: stat.timestamp, value: stat.value });
    }
  } else if ((statsPercentageDef as readonly string[]).indexOf(key) !== -1) {
    for (const stat of stats.percentage.bodyfat ?? []) {
      rows.push({ type: "stats", id: `stat:${key}:${stat.timestamp}`, ts: stat.timestamp, value: stat.value.value });
    }
  } else {
    const lengthKey = statsLengthDef.find((k) => k === key);
    for (const stat of lengthKey != null ? (stats.length[lengthKey] ?? []) : []) {
      const value = Length_convertTo(stat.value, settings.lengthUnits).value;
      rows.push({ type: "stats", id: `stat:${key}:${stat.timestamp}`, ts: stat.timestamp, value });
    }
  }
  return rows.sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : 1));
}

export function LiftographRows_build(
  source: ILiftographSource,
  history: IHistoryRecord[],
  stats: IStats,
  settings: ISettings
): ILiftographRow[] {
  return LiftographRows_fromFinished(
    source,
    source.type === "stats" ? [] : LiftographRows_finished(history),
    stats,
    settings
  );
}

export function LiftographRows_fromFinished(
  source: ILiftographSource,
  finished: IHistoryRecord[],
  stats: IStats,
  settings: ISettings
): ILiftographRow[] {
  if (source.type === "stats") {
    return statsRows(source.key, stats, settings);
  }
  const rows: ILiftographRow[] = [];
  const defaultEquipment =
    source.type === "exercise" ? exerciseDefaultEquipment(source.exerciseId, settings.exercises) : undefined;
  for (const record of finished) {
    if (!matchesWorkout(record, source)) {
      continue;
    }
    const ts = record.startTime;
    if (source.type === "workout") {
      rows.push({ type: "workout", id: `${record.id}`, ts, record });
      continue;
    }
    const entries = [...record.entries].sort((a, b) => a.index - b.index);
    for (const entry of entries) {
      if (matchesEntry(entry, source, defaultEquipment)) {
        rows.push({ type: "exercise", id: `${record.id}:${entry.id}`, ts, record, entry });
      }
    }
  }
  return rows;
}
