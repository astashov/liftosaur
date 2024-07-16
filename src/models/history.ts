import { Exercise } from "./exercise";
import { Progress } from "./progress";
import { CollectionUtils } from "../utils/collection";

import { Weight } from "./weight";
import {
  IHistoryEntry,
  IHistoryRecord,
  ISet,
  IExerciseType,
  IUnit,
  IWeight,
  ISettings,
  IProgram,
  IDayData,
  IScreenMuscle,
  screenMuscles,
} from "../types";
import { ICollectorFn } from "../utils/collector";
import { Reps } from "./set";
import { ProgramExercise } from "./programExercise";

export interface IHistoricalEntries {
  last: { entry: IHistoryEntry; time: number };
  max: { entry: IHistoryEntry; time: number };
}

export interface IHistoryRecordAndEntry {
  record: IHistoryRecord;
  entry: IHistoryEntry;
}

export namespace History {
  export function buildFromEntry(entry: IHistoryEntry, dayData: IDayData): IHistoryRecord {
    return {
      id: 0,
      date: new Date().toISOString(),
      programId: "",
      programName: "",
      day: dayData.day,
      week: dayData.week,
      dayInWeek: dayData.dayInWeek,
      dayName: dayData.day.toString(),
      startTime: Date.now(),
      entries: [entry],
    };
  }

  export function createCustomEntry(exerciseType: IExerciseType): IHistoryEntry {
    return {
      exercise: exerciseType,
      sets: [],
      warmupSets: [],
    };
  }

  export function roundSetsInEntry(
    entry: IHistoryEntry,
    settings: ISettings,
    exerciseType?: IExerciseType
  ): IHistoryEntry {
    return { ...entry, sets: Reps.roundSets(entry.sets, settings, exerciseType) };
  }

  export function finishProgramDay(progress: IHistoryRecord, settings: ISettings, program?: IProgram): IHistoryRecord {
    const { deletedProgramExercises, ui, ...historyRecord } = progress;
    const updatedAt = Date.now();
    return {
      ...historyRecord,
      entries: historyRecord.entries.map((entry) => {
        const programExercise = program?.exercises.filter((pe) => pe.id === entry.programExerciseId)[0];
        if (Progress.isCurrent(progress)) {
          entry = {
            ...entry,
            sets: entry.sets.map((set) => {
              return { ...set, weight: Weight.roundConvertTo(set.weight, settings, entry.exercise) };
            }),
          };
          if (programExercise != null) {
            const reuseLogicId = programExercise.reuseLogic?.selected;
            const state = reuseLogicId ? programExercise.reuseLogic?.states[reuseLogicId]! : programExercise.state;
            const useRm1 = ProgramExercise.isUsingVariable(programExercise, "rm1");
            entry = {
              ...entry,
              state: { ...state },
              vars: useRm1 ? { rm1: Exercise.onerm(programExercise.exerciseType, settings) } : {},
            };
          }
        }
        return entry;
      }),
      id: Progress.isCurrent(progress) ? progress.startTime : progress.id,
      updatedAt: updatedAt,
      timerSince: undefined,
      timerMode: undefined,
      ...(Progress.isCurrent(progress) ? { endTime: Date.now() } : {}),
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

  export function collectProgramChangeTimes(): ICollectorFn<
    IHistoryRecord,
    {
      currentProgram?: string;
      changeProgramTimes: [number, string][];
    }
  > {
    return {
      fn: (acc, hr) => {
        if (!acc.currentProgram || acc.currentProgram !== hr.programName) {
          acc.currentProgram = hr.programName;
          acc.changeProgramTimes.push([new Date(Date.parse(hr.date)).getTime() / 1000, acc.currentProgram]);
        }
        return acc;
      },
      initial: { changeProgramTimes: [] },
    };
  }

  export function collectMuscleGroups(
    settings: ISettings
  ): ICollectorFn<IHistoryRecord, Record<IScreenMuscle | "total", [number[], number[], number[]]>> {
    return {
      fn: (acc, hr) => {
        for (const entry of hr.entries) {
          const exercise = Exercise.get(entry.exercise, settings.exercises);
          const targetMuscleGroups = Exercise.targetMusclesGroups(exercise, settings.exercises);
          const synergistMuscleGroups = Exercise.synergistMusclesGroups(exercise, settings.exercises);
          for (const muscleGroup of [...screenMuscles, "total"] as const) {
            let multiplier = 0;
            if (muscleGroup === "total") {
              multiplier = 1;
            } else if (targetMuscleGroups.indexOf(muscleGroup) !== -1) {
              multiplier = 1;
            } else if (synergistMuscleGroups.indexOf(muscleGroup) !== -1) {
              multiplier = 0.5;
            }
            if (multiplier === 0) {
              continue;
            }
            const muscleGroupAcc = acc[muscleGroup];
            const date = new Date(hr.startTime);
            const lastTs = muscleGroupAcc[0][muscleGroupAcc[0]?.length - 1];
            const finishedSets = entry.sets.filter((s) => (s.completedReps || 0) > 0);
            if (lastTs == null) {
              muscleGroupAcc[0].push(Math.round(date.getTime() / 1000));
              muscleGroupAcc[1].push(0);
              muscleGroupAcc[2].push(0);
            } else {
              const lastDate = new Date(lastTs * 1000);
              const beginningOfWeekForDate = new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate() - date.getDay()
              );
              const beginningOfWeekForLastDate = new Date(
                lastDate.getFullYear(),
                lastDate.getMonth(),
                lastDate.getDate() - lastDate.getDay()
              );
              if (beginningOfWeekForDate.getTime() !== beginningOfWeekForLastDate.getTime()) {
                muscleGroupAcc[0].push(Math.round(date.getTime() / 1000));
                muscleGroupAcc[1].push(0);
                muscleGroupAcc[2].push(0);
              }
            }
            muscleGroupAcc[1][muscleGroupAcc[1].length - 1] += Reps.volume(finishedSets).value * multiplier;
            muscleGroupAcc[2][muscleGroupAcc[2].length - 1] += finishedSets.length * multiplier;
          }
        }
        return acc;
      },
      initial: {
        total: [[], [], []],
        shoulders: [[], [], []],
        triceps: [[], [], []],
        back: [[], [], []],
        abs: [[], [], []],
        glutes: [[], [], []],
        hamstrings: [[], [], []],
        quadriceps: [[], [], []],
        chest: [[], [], []],
        biceps: [[], [], []],
        calves: [[], [], []],
        forearms: [[], [], []],
      },
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
    return {
      fn: (acc, hr) => {
        const entries = hr.entries.filter((e) => Exercise.eq(e.exercise, exerciseType));
        const allSets = entries.flatMap((e) => e.sets);
        const all1RMs = allSets.map<[ISet, IWeight]>((s) => [s, Weight.getOneRepMax(s.weight, s.completedReps || 0)]);
        const max1RM = CollectionUtils.sort(all1RMs, (a, b) => Weight.compare(b[1], a[1]))[0];
        if (max1RM != null && Weight.gt(max1RM[1], acc.max1RM)) {
          acc = { max1RM: max1RM[1], max1RMHistoryRecord: hr, max1RMSet: max1RM[0] };
        }
        return acc;
      },
      initial: { max1RM: Weight.build(0, settings.units) },
    };
  }

  export function findAllMaxSetsPerId(history: IHistoryRecord[]): Partial<Record<string, ISet>> {
    const maxSets: Partial<Record<string, ISet>> = {};
    for (const r of history) {
      for (const e of r.entries) {
        const entryMaxSet = getMaxSetFromEntry(e);
        const key = Exercise.toKey(e.exercise);
        if (
          entryMaxSet != null &&
          (entryMaxSet.completedReps || 0) > 0 &&
          Weight.lt(maxSets[key]?.weight || 0, entryMaxSet.weight)
        ) {
          maxSets[key] = entryMaxSet;
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

  export function totalRecordSets(record: IHistoryRecord): number {
    return record.entries.reduce((memo, e) => memo + totalEntrySets(e), 0);
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

  export function totalEntrySets(entry: IHistoryEntry): number {
    return getFinishedSets(entry).length;
  }

  export function getStartedEntries(record: IHistoryRecord): IHistoryEntry[] {
    return record.entries.filter((e) => e.sets.filter((s) => (s.completedReps || 0) > 0).length > 0);
  }

  export function getFinishedSets(entry: IHistoryEntry): ISet[] {
    return entry.sets.filter((s) => Reps.isFinishedSet(s));
  }

  export function getHistoricalSameDay(
    history: IHistoryRecord[],
    progress: IHistoryRecord,
    currentEntry: IHistoryEntry
  ): IHistoryRecordAndEntry | undefined {
    for (const record of history) {
      if (record.programId === progress.programId && record.day === progress.day) {
        for (const entry of record.entries) {
          if (
            Exercise.eq(currentEntry.exercise, entry.exercise) &&
            currentEntry.programExerciseId === entry.programExerciseId &&
            entry.sets.length > 0 &&
            entry.sets.some((s) => (s.completedReps || 0) > 0)
          ) {
            return { record, entry };
          }
        }
      }
    }
    return undefined;
  }

  export function getHistoricalLastDay(
    history: IHistoryRecord[],
    currentEntry: IHistoryEntry
  ): IHistoryRecordAndEntry | undefined {
    for (const record of history) {
      for (const entry of record.entries) {
        if (
          Exercise.eq(currentEntry.exercise, entry.exercise) &&
          entry.sets.length > 0 &&
          entry.sets.some((s) => (s.completedReps || 0) > 0)
        ) {
          return { record, entry };
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
        "Workout DateTime",
        "Program",
        "Day Name",
        "Exercise",
        "Equipment",
        "Is Warmup Set?",
        "Required Reps",
        "Completed Reps",
        "RPE",
        "Is AMRAP?",
        "Weight Value",
        "Weight Unit",
        "Completed Reps Time",
        "Target Muscles",
        "Synergist Muscles",
        "Notes",
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
            warmupSet.completedRpe || null,
            0,
            warmupSet.weight.value,
            warmupSet.weight.unit,
            warmupSet.timestamp != null ? new Date(warmupSet.timestamp || 0).toISOString() : null,
            Exercise.targetMuscles(exercise, settings.exercises).join(","),
            Exercise.synergistMuscles(exercise, settings.exercises).join(","),
            entry.notes ?? "",
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
            set.completedRpe || null,
            set.isAmrap ? 1 : 0,
            set.weight.value,
            set.weight.unit,
            set.timestamp != null ? new Date(set.timestamp || 0).toISOString() : null,
            Exercise.targetMuscles(exercise, settings.exercises).join(","),
            Exercise.synergistMuscles(exercise, settings.exercises).join(","),
            entry.notes ?? "",
          ]);
        }
      }
    }

    return lines;
  }
}
