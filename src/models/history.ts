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
  IDayData,
  IScreenMuscle,
  screenMuscles,
  IIntervals,
} from "../types";
import { ICollectorFn } from "../utils/collector";
import { Reps } from "./set";
import { ProgramExercise } from "./programExercise";
import { IState, updateState } from "./state";
import { lb, lbu } from "lens-shmens";
import { ObjectUtils } from "../utils/object";
import { IDispatch } from "../ducks/types";
import { SendMessage } from "../utils/sendMessage";
import memoize from "micro-memoize";
import { DateUtils } from "../utils/date";
import { IEvaluatedProgram, Program } from "./program";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";

export interface IHistoricalEntries {
  last: { entry: IHistoryEntry; time: number };
  max: { entry: IHistoryEntry; time: number };
}

export interface IHistoryRecordAndEntry {
  record: IHistoryRecord;
  entry: IHistoryEntry;
}

// history id -> exercise key -> personal records
export type IPersonalRecords = Partial<Record<string, Partial<Record<string, IHistoryEntryPersonalRecords>>>>;

export interface IHistoryEntryPersonalRecords {
  maxWeightSet?: ISet;
  prevMaxWeightSet?: ISet;
  max1RMSet?: ISet;
  prevMax1RMSet?: ISet;
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

  export function finishProgramDay(
    progress: IHistoryRecord,
    settings: ISettings,
    day: number,
    program?: IEvaluatedProgram
  ): IHistoryRecord {
    const { deletedProgramExercises, ui, ...historyRecord } = progress;
    const programDay = program ? Program.getProgramDay(program, day) : undefined;
    const dayExercises = programDay ? Program.getProgramDayExercises(programDay) : [];
    const updatedAt = Date.now();
    const endTime = Progress.isCurrent(progress) ? Date.now() : (progress.endTime ?? Date.now());
    return {
      ...historyRecord,
      entries: historyRecord.entries.map((entry) => {
        const programExercise = dayExercises.find((pe) => pe.key === entry.programExerciseId);
        if (Progress.isCurrent(progress)) {
          entry = {
            ...entry,
            updatePrints: undefined,
            sets: entry.sets.map((set) => {
              return {
                ...set,
                completedReps: set.isCompleted ? set.completedReps : undefined,
                completedRpe: set.isCompleted ? set.completedRpe : undefined,
                completedWeight: set.isCompleted ? set.completedWeight : undefined,
              };
            }),
          };
          if (programExercise != null) {
            const state = PlannerProgramExercise.getState(programExercise);
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
      id: Progress.isCurrent(progress) ? endTime : progress.id,
      updatedAt: updatedAt,
      timerSince: undefined,
      timerMode: undefined,
      intervals: History.pauseWorkout(progress.intervals),
      ...(Progress.isCurrent(progress) ? { endTime } : {}),
    };
  }

  export function getMaxWeightSetFromEntry(entry: IHistoryEntry): ISet | undefined {
    return getMaxWeightSet(entry.sets);
  }

  export function getMax1RMSetFromEntry(entry: IHistoryEntry): ISet | undefined {
    return getMax1RMSet(entry.sets);
  }

  export function getMaxWeightSet(sets: ISet[]): ISet | undefined {
    return CollectionUtils.sort(
      sets.filter((s) => (s.completedReps || 0) > 0),
      (a, b) => {
        const weightDiff = Weight.compare(
          b.completedWeight ?? b.weight ?? Weight.build(0, "lb"),
          a.completedWeight ?? a.weight ?? Weight.build(0, "lb")
        );
        if (weightDiff === 0 && a.completedReps && b.completedReps) {
          return b.completedReps - a.completedReps;
        }
        return weightDiff;
      }
    )[0];
  }

  export function getMax1RMSet(sets: ISet[]): ISet | undefined {
    return CollectionUtils.sort(
      sets.filter((s) => (s.completedReps || 0) > 0),
      (a, b) => {
        const weightDiff = Weight.compare(
          Weight.getOneRepMax(
            b.completedWeight ?? b.weight ?? Weight.build(0, "lb"),
            b.completedReps || 0,
            b.completedRpe ?? b.rpe ?? 10
          ),
          Weight.getOneRepMax(
            a.completedWeight ?? a.weight ?? Weight.build(0, "lb"),
            a.completedReps || 0,
            a.completedRpe ?? a.rpe ?? 10
          )
        );
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

  export function collectLastEntry(
    startTime: number,
    exerciseType: IExerciseType
  ): ICollectorFn<
    IHistoryRecord,
    { lastHistoryEntry?: IHistoryEntry; lastHistoryRecord?: IHistoryRecord; timestamp?: number }
  > {
    return {
      fn: (acc, hr) => {
        const time = hr.endTime ?? hr.startTime;
        if (time < startTime && (acc.timestamp == null || time > acc.timestamp)) {
          const entry = hr.entries.find((e) => Exercise.eq(e.exercise, exerciseType) && Reps.isStarted(e.sets));
          if (entry) {
            acc = { lastHistoryEntry: entry, lastHistoryRecord: hr, timestamp: time };
          }
        }
        return acc;
      },
      initial: {},
    };
  }

  export function collectLastNote(
    startTime: number,
    exerciseType: IExerciseType
  ): ICollectorFn<IHistoryRecord, { lastNote?: string; timestamp?: number }> {
    return {
      fn: (acc, hr) => {
        const time = hr.endTime ?? hr.startTime;
        if (time < startTime && (acc.timestamp == null || time > acc.timestamp)) {
          const entry = hr.entries.find((e) => Exercise.eq(e.exercise, exerciseType));
          if (entry && entry.notes) {
            acc = { lastNote: entry.notes, timestamp: time };
          }
        }
        return acc;
      },
      initial: {},
    };
  }

  export function collectWeightPersonalRecord(
    exerciseType: IExerciseType,
    unit: IUnit
  ): ICollectorFn<IHistoryRecord, { maxWeight: IWeight; maxWeightHistoryRecord?: IHistoryRecord }> {
    return {
      fn: (acc, hr) => {
        const entries = hr.entries.filter((e) => Exercise.eq(e.exercise, exerciseType));
        const maxSet = getMaxWeightSet(entries.flatMap((e) => e.sets));
        if (maxSet != null) {
          const weight = maxSet.completedWeight ?? maxSet.weight ?? Weight.build(0, unit);
          if (Weight.gt(weight, acc.maxWeight)) {
            acc = { maxWeight: weight, maxWeightHistoryRecord: hr };
          }
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
        const all1RMs = allSets.map<[ISet, IWeight]>((s) => [
          s,
          Weight.getOneRepMax(s.completedWeight ?? s.weight ?? Weight.build(0, settings.units), s.completedReps || 0),
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

  export function findAllMaxSetsPerId(history: IHistoryRecord[]): Partial<Record<string, ISet>> {
    const maxSets: Partial<Record<string, ISet>> = {};
    for (const r of history) {
      for (const e of r.entries) {
        const entryMaxSet = getMaxWeightSetFromEntry(e);
        const key = Exercise.toKey(e.exercise);
        if (
          entryMaxSet != null &&
          (entryMaxSet.completedReps || 0) > 0 &&
          Weight.lt(maxSets[key]?.weight || 0, entryMaxSet.weight ?? Weight.build(0, "lb"))
        ) {
          maxSets[key] = entryMaxSet;
        }
      }
    }
    return maxSets;
  }

  export const getDateToHistory = memoize(
    (history: IHistoryRecord[]): Partial<Record<string, IHistoryRecord>> => {
      return history.reduce<Partial<Record<string, IHistoryRecord>>>((memo, hr) => {
        memo[DateUtils.formatYYYYMMDD(hr.date)] = hr;
        return memo;
      }, {});
    },
    { maxSize: 10 }
  );

  export function getHistoryRecordsForTimerange(
    history: IHistoryRecord[],
    date: number,
    type: "month" | "week" | "day",
    startWeekFromMonday?: boolean
  ): IHistoryRecord[] {
    // For given date, get the start and end of the timerange, and return history records that fall within that range
    const start = new Date(date);
    const end = new Date(date);
    if (type === "month") {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    } else if (type === "week") {
      start.setDate(start.getDate() - start.getDay() + (startWeekFromMonday ? 1 : 0));
      end.setDate(start.getDate() + 6);
    } else if (type === "day") {
      start.setHours(0, 0, 0, 0);
    }
    end.setHours(23, 59, 59, 999);
    return history.filter((hr) => {
      if (Progress.isCurrent(hr)) {
        return false;
      }
      const recordDate = Date.parse(hr.date);
      const startTime = new Date(recordDate);
      return startTime >= start && startTime < end;
    });
  }

  export function getNumberOfPersonalRecords(history: IHistoryRecord[], prs: IPersonalRecords): number {
    return history.reduce((memo, r) => {
      return memo + ObjectUtils.keys(prs[r.id] || {})?.length;
    }, 0);
  }

  export const getPersonalRecords = memoize(
    (history: IHistoryRecord[]): IPersonalRecords => {
      const result: IPersonalRecords = {};
      const sortedHistory = CollectionUtils.sortBy(history, "id");
      const max1RMSets: Partial<Record<string, ISet | undefined>> = {};
      const maxWeightSets: Partial<Record<string, ISet | undefined>> = {};
      for (const record of sortedHistory) {
        for (const entry of record.entries) {
          const key = Exercise.toKey(entry.exercise);

          const thisMaxWeightSet = getMaxWeightSetFromEntry(entry);
          const thisMaxWeight = thisMaxWeightSet
            ? (thisMaxWeightSet.completedWeight ?? thisMaxWeightSet.weight)
            : undefined;
          const lastMaxWeight = maxWeightSets[key]?.completedWeight ?? maxWeightSets[key]?.weight;
          if (thisMaxWeight != null && (lastMaxWeight == null || Weight.gt(thisMaxWeight, lastMaxWeight))) {
            const prevMaxWeightSet = maxWeightSets[key];
            maxWeightSets[key] = thisMaxWeightSet;
            result[record.id] = result[record.id] || {};
            result[record.id]![key] = result[record.id]![key] || {};
            result[record.id]![key]!.prevMaxWeightSet = prevMaxWeightSet;
            result[record.id]![key]!.maxWeightSet = thisMaxWeightSet;
          }

          const thisMax1RMSet = getMax1RMSetFromEntry(entry);
          const thisMax1RM = thisMax1RMSet
            ? Weight.getOneRepMax(
                thisMax1RMSet.completedWeight ?? thisMax1RMSet.weight ?? Weight.build(0, "lb"),
                thisMax1RMSet.completedReps || 0,
                thisMax1RMSet.completedRpe ?? thisMax1RMSet.rpe
              )
            : undefined;
          const lastMax1RMSet = max1RMSets[key];
          const lastMax1RM = lastMax1RMSet
            ? Weight.getOneRepMax(
                lastMax1RMSet.completedWeight ?? lastMax1RMSet.weight ?? Weight.build(0, "lb"),
                lastMax1RMSet?.completedReps || 0,
                lastMax1RMSet.completedRpe ?? lastMax1RMSet.rpe
              )
            : undefined;
          if (thisMax1RM != null && (lastMax1RM == null || Weight.gt(thisMax1RM, lastMax1RM))) {
            const prevMax1RMSet = max1RMSets[key];
            max1RMSets[key] = thisMax1RMSet;
            result[record.id] = result[record.id] || {};
            result[record.id]![key] = result[record.id]![key] || {};
            result[record.id]![key]!.prevMax1RMSet = prevMax1RMSet;
            result[record.id]![key]!.max1RMSet = thisMax1RMSet;
          }
        }
      }
      return result;
    },
    { maxSize: 10 }
  );

  export function findMaxSet(exerciseType: IExerciseType, history: IHistoryRecord[]): ISet | undefined {
    let maxSet: ISet | undefined = undefined;
    for (const r of history) {
      for (const e of r.entries) {
        if (Exercise.eq(e.exercise, exerciseType)) {
          const entryMaxSet = getMaxWeightSetFromEntry(e);
          if (entryMaxSet != null && (entryMaxSet.completedReps || 0) > 0) {
            if (
              maxSet == null ||
              Weight.gt(entryMaxSet.weight ?? Weight.build(0, "lb"), maxSet.weight ?? Weight.build(0, "lb"))
            ) {
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
    const entryMaxSet = getMaxWeightSetFromEntry(entry);
    if (entryMaxSet != null && (entryMaxSet.completedReps || 0) > 0) {
      for (const r of history) {
        if (r.id < id) {
          for (const e of r.entries) {
            if (e.exercise.id === entry.exercise.id && e.exercise.equipment === entry.exercise.equipment) {
              if (isMax == null) {
                isMax = true;
              }
              const maxSet = getMaxWeightSetFromEntry(e);
              if (
                maxSet != null &&
                Weight.gte(maxSet.weight ?? Weight.build(0, "lb"), entryMaxSet.weight ?? Weight.build(0, "lb"))
              ) {
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
        (memo, set) =>
          Weight.add(
            memo,
            Weight.multiply(set.completedWeight ?? set.weight ?? Weight.build(0, unit), set.completedReps || 0)
          ),
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
      if (record.day === progress.day) {
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

  export function calories(historyRecord: IHistoryRecord): number {
    const timeMs = workoutTime(historyRecord);
    const minutes = Math.floor(timeMs / 60000);
    return minutes * 6;
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
            if (
              set.isAmrap &&
              set.reps === nextSet.reps &&
              Weight.eq(set.weight ?? Weight.build(0, "lb"), nextSet.weight ?? Weight.build(0, "lb"))
            ) {
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
            Exercise.fullName(exercise, settings),
            1,
            warmupSet.reps ?? 0,
            warmupSet.completedReps || null,
            warmupSet.completedRpe || null,
            0,
            warmupSet.weight?.value ?? 0,
            warmupSet.weight?.unit ?? settings.units,
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
            Exercise.fullName(exercise, settings),
            0,
            set.reps ?? 0,
            set.completedReps || null,
            set.completedRpe || null,
            set.isAmrap ? 1 : 0,
            set.weight?.value ?? 0,
            set.weight?.unit ?? settings.units,
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

  export function pauseWorkoutAction(dispatch: IDispatch): void {
    const lensGetters = { progress: lb<IState>().p("progress").pi(0).get() };
    SendMessage.toIosAndAndroid({ type: "pauseWorkout" });
    updateState(dispatch, [
      lbu<IState, typeof lensGetters>(lensGetters)
        .p("progress")
        .pi(0)
        .p("intervals")
        .recordModify((intervals, getters) => pauseWorkout(getters.progress.intervals)),
    ]);
  }

  export function pauseWorkout(intervals?: IIntervals): IIntervals | undefined {
    if (intervals && !isPaused(intervals)) {
      const newIntervals = intervals ? ObjectUtils.clone(intervals) : [];
      let lastInterval = newIntervals[newIntervals.length - 1];
      if (lastInterval == null) {
        lastInterval = [Date.now(), undefined];
        newIntervals.push(lastInterval);
      }
      lastInterval[1] = Date.now();
      return newIntervals;
    } else {
      return intervals;
    }
  }

  export function resumeWorkoutAction(dispatch: IDispatch, settings: ISettings): void {
    updateState(dispatch, [
      lb<IState>()
        .p("progress")
        .pi(0)
        .p("intervals")
        .recordModify((intervals) => resumeWorkout(intervals, settings.timers.reminder)),
    ]);
  }

  export function isPaused(intervals?: IIntervals): boolean {
    return intervals ? intervals.length === 0 || intervals[intervals.length - 1][1] != null : false;
  }

  export function resumeWorkout(intervals?: IIntervals, reminder?: number): IIntervals | undefined {
    SendMessage.toIosAndAndroid({ type: "resumeWorkout", reminder: `${reminder || 0}` });
    if (isPaused(intervals)) {
      const newIntervals = intervals ? ObjectUtils.clone(intervals) : [];
      newIntervals.push([Date.now(), undefined]);
      return newIntervals;
    } else {
      return intervals;
    }
  }

  export function workoutTime(historyRecord: IHistoryRecord): number {
    const intervals = historyRecord.intervals || [[historyRecord.startTime, historyRecord.endTime || Date.now()]];
    return intervals.reduce((memo, interval) => {
      return memo + ((interval[1] || Date.now()) - interval[0]);
    }, 0);
  }
}
