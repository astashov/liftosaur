import { Exercise } from "./exercise";
import { Progress } from "./progress";
import { CollectionUtils } from "../utils/collection";

import { Weight } from "./weight";
import { IHistoryEntry, IHistoryRecord, ISet, IExerciseType, IExerciseId, IUnit, IWeight, ISettings } from "../types";

export interface IHistoricalEntries {
  last: { entry: IHistoryEntry; time: number };
  max: { entry: IHistoryEntry; time: number };
}

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

  export function getHistoricalSameEntry(
    history: IHistoryRecord[],
    currentEntry: IHistoryEntry
  ): IHistoricalEntries | undefined {
    let last: { entry: IHistoryEntry; time: number } | undefined;
    let max: { entry: IHistoryEntry; time: number } | undefined;
    for (const record of history) {
      for (const entry of record.entries) {
        if (Exercise.eq(currentEntry.exercise, entry.exercise)) {
          const allSetsSame = entry.sets.every(
            (set, i) => set.reps === currentEntry.sets[i]?.reps && Weight.eq(set.weight, currentEntry.sets[i]?.weight)
          );
          if (allSetsSame) {
            if (last == null) {
              last = { entry, time: record.startTime };
            }
            if (max == null || totalEntryReps(entry) > totalEntryReps(max.entry)) {
              max = { entry, time: record.startTime };
            }
          }
        }
      }
    }
    return last != null && max != null ? { last, max } : undefined;
  }

  export function getHistoricalAmrapSets(
    history: IHistoryRecord[],
    currentEntry: IHistoryEntry,
    nextSet?: ISet
  ): { last: [ISet, number]; max: [ISet, number] } | undefined {
    if (!nextSet?.isAmrap) {
      return undefined;
    }
    let last: [ISet, number] | undefined;
    let max: [ISet, number] | undefined;
    for (const record of history) {
      for (const entry of record.entries) {
        if (Exercise.eq(currentEntry.exercise, entry.exercise)) {
          for (const set of entry.sets) {
            if (set.isAmrap && set.reps === nextSet.reps && Weight.eq(set.weight, nextSet.weight)) {
              if (last == null) {
                last = [set, record.startTime];
              }
              if (max == null || (set.completedReps || 0) > (max[0].completedReps || 0)) {
                max = [set, record.startTime];
              }
            }
          }
        }
      }
    }
    return last != null && max != null ? { last, max } : undefined;
  }

  export function exportAsCSV(history: IHistoryRecord[], settings: ISettings): (string | number | null)[][] {
    const lines: (string | number | null)[][] = [
      [
        "DateTime",
        "Program",
        "Day Name",
        "Exercise",
        "Equipment",
        "Is Warmup Set?",
        "Required Reps",
        "Completed Reps",
        "Is AMRAP?",
        "Weight Value",
        "Weight Unit",
        "Completed Reps Time",
        "Target Muscles",
        "Synergist Muscles",
      ],
    ];

    for (const historyRecord of history) {
      for (const entry of historyRecord.entries) {
        const exercise = Exercise.get(entry.exercise, settings.exercises);
        for (const warmupSet of entry.warmupSets) {
          lines.push([
            historyRecord.date,
            historyRecord.programName,
            historyRecord.dayName,
            exercise.name,
            exercise.equipment || null,
            1,
            warmupSet.reps,
            warmupSet.completedReps || null,
            0,
            warmupSet.weight.value,
            warmupSet.weight.unit,
            warmupSet.timestamp != null ? new Date(warmupSet.timestamp || 0).toUTCString() : null,
            Exercise.targetMuscles(exercise, settings.exercises).join(","),
            Exercise.synergistMuscles(exercise, settings.exercises).join(","),
          ]);
        }
        for (const set of entry.sets) {
          lines.push([
            historyRecord.date,
            historyRecord.programName,
            historyRecord.dayName,
            exercise.name,
            exercise.equipment || null,
            0,
            set.reps,
            set.completedReps || null,
            set.isAmrap ? 1 : 0,
            set.weight.value,
            set.weight.unit,
            set.timestamp != null ? new Date(set.timestamp || 0).toUTCString() : null,
            Exercise.targetMuscles(exercise, settings.exercises).join(","),
            Exercise.synergistMuscles(exercise, settings.exercises).join(","),
          ]);
        }
      }
    }

    return lines;
  }
}
