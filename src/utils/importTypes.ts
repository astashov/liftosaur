import { ICustomExercise, IHistoryRecord } from "../types";

export interface IImportRowError {
  row: number;
  column?: string;
  value?: string;
  message: string;
}

export interface IImportResult {
  historyRecords: IHistoryRecord[];
  customExercises: Record<string, ICustomExercise>;
  errors: IImportRowError[];
  warnings: IImportRowError[];
}

export class ImportFileError extends Error {}

export function ImportUtils_customExercisesForRecords(
  records: IHistoryRecord[],
  customExercises: Record<string, ICustomExercise>
): Record<string, ICustomExercise> {
  const referencedIds = new Set<string>();
  for (const record of records) {
    for (const entry of record.entries) {
      referencedIds.add(entry.exercise.id);
    }
  }
  const result: Record<string, ICustomExercise> = {};
  for (const id of Object.keys(customExercises)) {
    if (referencedIds.has(id)) {
      result[id] = customExercises[id];
    }
  }
  return result;
}

const hevySignatureHeaders = ["start_time", "exercise_title", "set_type"];
const liftosaurSignatureHeaders = ["workout datetime", "exercise", "is warmup set?"];

export function ImportUtils_detectCsvKind(headers: string[]): "hevy" | "liftosaur" | "unknown" {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  if (hevySignatureHeaders.every((h) => normalized.includes(h))) {
    return "hevy";
  }
  if (liftosaurSignatureHeaders.every((h) => normalized.includes(h))) {
    return "liftosaur";
  }
  return "unknown";
}

const maxWeightLb = 3000;
const maxReps = 1000;
const minTimestamp = Date.UTC(2000, 0, 1);

export function ImportUtils_isSuspiciousWeight(value: number, unit: "kg" | "lb"): boolean {
  const lb = unit === "kg" ? value * 2.2046 : value;
  return lb < 0 || lb > maxWeightLb;
}

export function ImportUtils_isSuspiciousReps(value: number): boolean {
  return value < 0 || value > maxReps;
}

export function ImportUtils_isSuspiciousTimestamp(ts: number): boolean {
  return ts < minTimestamp || ts > Date.now() + 24 * 60 * 60 * 1000;
}

export interface IImportSummary {
  workoutCount: number;
  minStartTime?: number;
  maxStartTime?: number;
  customExerciseNames: string[];
  duplicateIds: Set<number>;
}

export function ImportUtils_summarize(result: IImportResult, existingHistory: IHistoryRecord[]): IImportSummary {
  let minStartTime: number | undefined;
  let maxStartTime: number | undefined;
  for (const record of result.historyRecords) {
    if (minStartTime == null || record.startTime < minStartTime) {
      minStartTime = record.startTime;
    }
    if (maxStartTime == null || record.startTime > maxStartTime) {
      maxStartTime = record.startTime;
    }
  }
  return {
    workoutCount: result.historyRecords.length,
    minStartTime,
    maxStartTime,
    customExerciseNames: Object.values(result.customExercises)
      .map((e) => e.name)
      .sort(),
    duplicateIds: ImportUtils_findDuplicates(result.historyRecords, existingHistory),
  };
}

const duplicateToleranceMs = 60 * 1000;

export function ImportUtils_findDuplicates(records: IHistoryRecord[], existingHistory: IHistoryRecord[]): Set<number> {
  const existingStartTimes = existingHistory.map((r) => r.startTime).sort((a, b) => a - b);
  const duplicates = new Set<number>();
  for (const record of records) {
    let lo = 0;
    let hi = existingStartTimes.length - 1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const diff = existingStartTimes[mid] - record.startTime;
      if (Math.abs(diff) <= duplicateToleranceMs) {
        duplicates.add(record.id);
        break;
      } else if (diff < 0) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
  }
  return duplicates;
}
