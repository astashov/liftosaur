import { equipmentToBarKey, Exercise } from "./exercise";
import { Progress } from "./progress";
import { CollectionUtils } from "../utils/collection";

import { Weight } from "./weight";
import {
  IHistoryEntry,
  IHistoryRecord,
  ISet,
  IExerciseType,
  IExerciseId,
  IUnit,
  IWeight,
  ISettings,
  IProgram,
} from "../types";
import { ICollectorFn } from "../utils/collector";

export interface IHistoricalEntries {
  last: { entry: IHistoryEntry; time: number };
  max: { entry: IHistoryEntry; time: number };
}

export interface IHistoryRecordAndEntry {
  record: IHistoryRecord;
  entry: IHistoryEntry;
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

  export function createCustomEntry(exerciseId: IExerciseId, settings: ISettings): IHistoryEntry {
    const equipment = Exercise.defaultEquipment(exerciseId, settings.exercises);
    const exerciseType: IExerciseType = { id: exerciseId, equipment };

    return {
      exercise: exerciseType,
      sets: [],
      warmupSets: [],
    };
  }

  export function finishProgramDay(program: IProgram, progress: IHistoryRecord): IHistoryRecord {
    const { deletedProgramExercises, ui, ...historyRecord } = progress;
    return {
      ...historyRecord,
      entries: historyRecord.entries.map((entry) => {
        const programExercise = program.exercises.filter((pe) => pe.id === entry.programExerciseId)[0];
        if (programExercise != null) {
          const reuseLogicId = programExercise.reuseLogic?.selected;
          const state = reuseLogicId ? programExercise.reuseLogic?.states[reuseLogicId]! : programExercise.state;
          return {
            ...entry,
            state: { ...state },
          };
        } else {
          return entry;
        }
      }),
      id: Progress.isCurrent(progress) ? Date.now() : progress.id,
      timerSince: undefined,
      timerMode: undefined,
      endTime: Date.now(),
    };
  }

  export function getMaxSetFromEntry(entry: IHistoryEntry): ISet | undefined {
    return CollectionUtils.sort(
      entry.sets.filter((s) => (s.completedReps || 0) > 0),
      (a, b) => {
        const weightDiff = Weight.compare(b.weight, a.weight);
        if (weightDiff === 0 && a.completedReps && b.completedReps) {
          return b.completedReps - a.completedReps;
        }
        return weightDiff;
      }
    )[0];
  }

  export function getMaxSet(sets: ISet[]): ISet | undefined {
    return CollectionUtils.sort(
      sets.filter((s) => (s.completedReps || 0) > 0),
      (a, b) => {
        const weightDiff = Weight.compare(b.weight, a.weight);
        if (weightDiff === 0 && a.completedReps && b.completedReps) {
          return b.completedReps - a.completedReps;
        }
        return weightDiff;
      }
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

  export function findAllUsedExerciseTypes(history: IHistoryRecord[]): Partial<Record<string, IExerciseType>> {
    const set: Partial<Record<string, IExerciseType>> = {};
    for (const record of history) {
      for (const entry of record.entries) {
        set[Exercise.toKey(entry.exercise)] = entry.exercise;
      }
    }
    return set;
  }

  export function collectMinAndMaxTime(): ICollectorFn<IHistoryRecord, { minTime: number; maxTime: number }> {
    return {
      fn: (acc, hr) => {
        if (acc.maxTime < hr.startTime) {
          acc.maxTime = hr.startTime;
        }
        if (acc.minTime > hr.startTime) {
          acc.minTime = hr.startTime;
        }
        return acc;
      },
      initial: { maxTime: 0, minTime: Infinity },
    };
  }

  export function collectAllUsedExerciseTypes(): ICollectorFn<IHistoryRecord, Partial<Record<string, IExerciseType>>> {
    return {
      fn: (acc, hr) => {
        for (const entry of hr.entries) {
          acc[Exercise.toKey(entry.exercise)] = entry.exercise;
        }
        return acc;
      },
      initial: {},
    };
  }

  export function collectAllHistoryRecordsOfExerciseType(
    exerciseType: IExerciseType
  ): ICollectorFn<IHistoryRecord, IHistoryRecord[]> {
    return {
      fn: (acc, hr) => {
        const hasExercise = hr.entries.some((e) => Exercise.eq(e.exercise, exerciseType));
        if (hasExercise) {
          acc.push(hr);
        }
        return acc;
      },
      initial: [],
    };
  }

  export function collectWeightPersonalRecord(
    exerciseType: IExerciseType,
    unit: IUnit
  ): ICollectorFn<IHistoryRecord, { maxWeight: IWeight; maxWeightHistoryRecord?: IHistoryRecord }> {
    return {
      fn: (acc, hr) => {
        const entries = hr.entries.filter((e) => Exercise.eq(e.exercise, exerciseType));
        const maxSet = getMaxSet(entries.flatMap((e) => e.sets));
        if (maxSet != null && Weight.gt(maxSet.weight, acc.maxWeight)) {
          acc = { maxWeight: maxSet.weight, maxWeightHistoryRecord: hr };
        }
        return acc;
      },
      initial: { maxWeight: Weight.build(0, unit) },
    };
  }

  export function collect1RMPersonalRecord(
    exerciseType: IExerciseType,
    settings: ISettings
  ): ICollectorFn<IHistoryRecord, { max1RM: IWeight; max1RMHistoryRecord?: IHistoryRecord; max1RMSet?: ISet }> {
    const bar = equipmentToBarKey(exerciseType.equipment);
    return {
      fn: (acc, hr) => {
        const entries = hr.entries.filter((e) => Exercise.eq(e.exercise, exerciseType));
        const allSets = entries.flatMap((e) => e.sets);
        const all1RMs = allSets.map<[ISet, IWeight]>((s) => [
          s,
          Weight.getOneRepMax(s.weight, s.completedReps || 0, settings, bar),
        ]);
        const max1RM = CollectionUtils.sort(all1RMs, (a, b) => Weight.compare(b[1], a[1]))[0];
        if (max1RM != null && Weight.gt(max1RM[1], acc.max1RM)) {
          acc = { max1RM: max1RM[1], max1RMHistoryRecord: hr, max1RMSet: max1RM[0] };
        }
        return acc;
      },
      initial: { max1RM: Weight.build(0, settings.units) },
    };
  }

  export function findAllMaxSetsPerId(history: IHistoryRecord[]): Partial<Record<IExerciseId, ISet>> {
    const maxSets: Partial<Record<IExerciseId, ISet>> = {};
    for (const r of history) {
      for (const e of r.entries) {
        const entryMaxSet = getMaxSetFromEntry(e);
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
          const entryMaxSet = getMaxSetFromEntry(e);
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
    const entryMaxSet = getMaxSetFromEntry(entry);
    if (entryMaxSet != null && (entryMaxSet.completedReps || 0) > 0) {
      for (const r of history) {
        if (r.id < id) {
          for (const e of r.entries) {
            if (e.exercise.id === entry.exercise.id && e.exercise.equipment === entry.exercise.equipment) {
              if (isMax == null) {
                isMax = true;
              }
              const maxSet = getMaxSetFromEntry(e);
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

  export function totalRecordReps(record: IHistoryRecord): number {
    return record.entries.reduce((memo, e) => memo + totalEntryReps(e), 0);
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

  export function getHistoricalSameDay(
    history: IHistoryRecord[],
    progress: IHistoryRecord,
    currentEntry: IHistoryEntry
  ): IHistoryRecordAndEntry | undefined {
    for (const record of history) {
      if (record.programId === progress.programId && record.day === progress.day) {
        for (const entry of record.entries) {
          if (Exercise.eq(currentEntry.exercise, entry.exercise) && entry.sets.length > 0) {
            return { record, entry };
          }
        }
      }
    }
    return undefined;
  }

  export function getHistoricalLastDay(
    history: IHistoryRecord[],
    progress: IHistoryRecord,
    currentEntry: IHistoryEntry
  ): IHistoryRecordAndEntry | undefined {
    for (const record of history) {
      if (record.programId === progress.programId) {
        for (const entry of record.entries) {
          if (Exercise.eq(currentEntry.exercise, entry.exercise) && entry.sets.length > 0) {
            return { record, entry };
          }
        }
      }
    }
    return undefined;
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
