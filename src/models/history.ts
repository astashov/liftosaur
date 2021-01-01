import { TExerciseType, IExerciseType, Exercise, IExerciseId } from "./exercise";
import { TSet, ISet } from "./set";
import { Progress, TProgressUi, TProgressMode } from "./progress";
import * as t from "io-ts";
import { CollectionUtils } from "../utils/collection";

export const THistoryEntry = t.type(
  {
    exercise: TExerciseType,
    sets: t.array(TSet),
    warmupSets: t.array(TSet),
  },
  "THistoryEntry"
);
export type IHistoryEntry = t.TypeOf<typeof THistoryEntry>;

export const THistoryRecord = t.intersection(
  [
    t.interface({
      // ISO8601, like 2020-02-29T18:02:05+00:00
      date: t.string,
      programId: t.string,
      programName: t.string,
      day: t.number,
      dayName: t.string,
      entries: t.array(THistoryEntry),
      startTime: t.number,
      id: t.number,
    }),
    t.partial({
      endTime: t.number,
      ui: TProgressUi,
      timerSince: t.number,
      timerMode: TProgressMode,
    }),
  ],
  "THistoryRecord"
);
export type IHistoryRecord = t.TypeOf<typeof THistoryRecord>;

import { Weight, IWeight, IUnit } from "./weight";

export namespace History {
  export function buildFromEntry(entry: IHistoryEntry, day: number): IHistoryRecord {
    return {
      id: 0,
      date: new Date().toISOString(),
      programId: "",
      programName: "",
      day,
      dayName: day.toString(),
      startTime: Date.now(),
      entries: [entry],
    };
  }

  export function finishProgramDay(progress: IHistoryRecord): IHistoryRecord {
    return {
      ...progress,
      id: Progress.isCurrent(progress) ? Date.now() : progress.id,
      timerSince: undefined,
      timerMode: undefined,
      endTime: Date.now(),
      ui: undefined,
    };
  }

  export function getMaxSet(entry: IHistoryEntry): ISet | undefined {
    return CollectionUtils.sort(
      entry.sets.filter((s) => (s.completedReps || 0) > 0),
      (a, b) => Weight.compare(b.weight, a.weight)
    )[0];
  }

  export function findAllPersonalRecords(record: IHistoryRecord, history: IHistoryRecord[]): Map<IExerciseType, ISet> {
    const prs: Map<IExerciseType, ISet> = new Map();
    for (const entry of record.entries) {
      const set = History.findPersonalRecord(record.id, entry, history);
      if (set != null) {
        prs.set(entry.exercise, set);
      }
    }
    return prs;
  }

  export function findAllMaxSets(history: IHistoryRecord[]): Partial<Record<IExerciseId, ISet>> {
    const maxSets: Partial<Record<IExerciseId, ISet>> = {};
    for (const r of history) {
      for (const e of r.entries) {
        const entryMaxSet = getMaxSet(e);
        if (
          entryMaxSet != null &&
          (entryMaxSet.completedReps || 0) > 0 &&
          Weight.lt(maxSets[e.exercise.id]?.weight || 0, entryMaxSet.weight)
        ) {
          maxSets[e.exercise.id] = entryMaxSet;
        }
      }
    }
    return maxSets;
  }

  export function findMaxSet(exerciseType: IExerciseType, history: IHistoryRecord[]): ISet | undefined {
    let maxSet: ISet | undefined = undefined;
    for (const r of history) {
      for (const e of r.entries) {
        if (Exercise.eq(e.exercise, exerciseType)) {
          const entryMaxSet = getMaxSet(e);
          if (entryMaxSet != null && (entryMaxSet.completedReps || 0) > 0) {
            if (maxSet == null || Weight.gt(entryMaxSet.weight, maxSet.weight)) {
              maxSet = entryMaxSet;
            }
          }
        }
      }
    }
    return maxSet;
  }

  export function findPersonalRecord(id: number, entry: IHistoryEntry, history: IHistoryRecord[]): ISet | undefined {
    let isMax: boolean | undefined;
    const entryMaxSet = getMaxSet(entry);
    if (entryMaxSet != null && (entryMaxSet.completedReps || 0) > 0) {
      for (const r of history) {
        if (r.id < id) {
          for (const e of r.entries) {
            if (e.exercise.id === entry.exercise.id && e.exercise.equipment === entry.exercise.equipment) {
              if (isMax == null) {
                isMax = true;
              }
              const maxSet = getMaxSet(e);
              if (maxSet != null && Weight.gte(maxSet.weight, entryMaxSet.weight)) {
                isMax = false;
              }
            }
          }
        }
      }
    } else {
      isMax = false;
    }
    if (isMax == null || isMax === true) {
      return entryMaxSet;
    } else {
      return undefined;
    }
  }

  export function totalRecordWeight(record: IHistoryRecord, unit: IUnit): IWeight {
    return record.entries.reduce((memo, e) => Weight.add(memo, totalEntryWeight(e, unit)), Weight.build(0, unit));
  }

  export function totalEntryWeight(entry: IHistoryEntry, unit: IUnit): IWeight {
    return entry.sets
      .filter((s) => (s.completedReps || 0) > 0)
      .reduce(
        (memo, set) => Weight.add(memo, Weight.multiply(set.weight, set.completedReps || 0)),
        Weight.build(0, unit)
      );
  }

  export function totalEntryReps(entry: IHistoryEntry): number {
    return entry.sets.reduce((memo, set) => memo + (set.completedReps || 0), 0);
  }
}
