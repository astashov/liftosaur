import { History_entryMuscleGroups } from "../models/history";
import { Exercise_getVolumeMultiplier } from "../models/exercise";
import { Reps_avgUnilateralCompletedReps, Reps_volume } from "../models/set";
import { Weight_build, Weight_convertTo, Weight_getOneRepMax, Weight_multiply } from "../models/weight";
import { IHistoryEntry, IHistoryRecord, IScreenMuscle, ISet, ISettings, IStats, IUnit, IWeight } from "../types";

export interface ILiftographBodyweightPoint {
  ts: number;
  value: IWeight;
}

function isFinished(set: ISet): boolean {
  return (set.completedReps || 0) > 0;
}

export function LiftographMeasures_setWeight(set: ISet): IWeight | undefined {
  return isFinished(set) ? (set.completedWeight ?? set.weight) : undefined;
}

export function LiftographMeasures_setE1rm(set: ISet, unit: IUnit): IWeight | undefined {
  const weight = LiftographMeasures_setWeight(set);
  if (weight == null) {
    return undefined;
  }
  return Weight_getOneRepMax(
    Weight_convertTo(weight, unit),
    Reps_avgUnilateralCompletedReps(set) || 0,
    set.completedRpe ?? set.rpe ?? 10
  );
}

export function LiftographMeasures_entryVolume(entry: IHistoryEntry, settings: ISettings): IWeight {
  return Weight_multiply(
    Reps_volume(entry.sets, settings.units),
    Exercise_getVolumeMultiplier(entry.exercise, settings)
  );
}

export function LiftographMeasures_workoutDuration(record: IHistoryRecord): number | undefined {
  if (record.endTime == null) {
    return undefined;
  }
  const intervals = record.intervals ?? [[record.startTime, record.endTime]];
  let total = 0;
  for (const [start, end] of intervals) {
    if (end == null) {
      return undefined;
    }
    total += end - start;
  }
  return total / 60000;
}

export type ILiftographMuscleGroupTotals = Partial<Record<IScreenMuscle | "total", { sets: number; volume: IWeight }>>;

export function LiftographMeasures_muscleGroups(
  record: IHistoryRecord,
  settings: ISettings
): ILiftographMuscleGroupTotals {
  const result: ILiftographMuscleGroupTotals = {};
  for (const entry of record.entries) {
    const groups = History_entryMuscleGroups(entry, settings);
    for (const key of Object.keys(groups) as (IScreenMuscle | "total")[]) {
      const contribution = groups[key];
      if (contribution == null) {
        continue;
      }
      const current = result[key];
      result[key] = {
        sets: (current?.sets ?? 0) + contribution.sets,
        volume: Weight_build((current?.volume.value ?? 0) + contribution.volume, settings.units),
      };
    }
  }
  return result;
}

export function LiftographMeasures_bodyweightSeries(stats: IStats): ILiftographBodyweightPoint[] {
  return (stats.weight.weight ?? [])
    .map((stat) => ({ ts: stat.timestamp, value: stat.value }))
    .sort((a, b) => a.ts - b.ts);
}

export function LiftographMeasures_bodyweightAt(series: ILiftographBodyweightPoint[], ts: number): IWeight | undefined {
  let low = 0;
  let high = series.length - 1;
  let found: IWeight | undefined;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (series[mid].ts <= ts) {
      found = series[mid].value;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}
