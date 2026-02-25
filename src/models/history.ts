import {
  Exercise_getIsUnilateral,
  Exercise_onerm,
  Exercise_toKey,
  Exercise_get,
  Exercise_targetMusclesGroups,
  Exercise_synergistMusclesGroups,
  Exercise_synergistMusclesGroupMultipliers,
  Exercise_eq,
  Exercise_fullName,
  Exercise_targetMuscles,
  Exercise_synergistMuscles,
} from "./exercise";
import { Progress_getEntryId, Progress_isCurrent, Progress_lbProgress } from "./progress";
import { CollectionUtils_sort, CollectionUtils_sortBy } from "../utils/collection";

import {
  Weight_compare,
  Weight_build,
  Weight_getOneRepMax,
  Weight_gt,
  Weight_lt,
  Weight_gte,
  Weight_add,
  Weight_eq,
} from "./weight";
import {
  IHistoryEntry,
  IHistoryRecord,
  ISet,
  IExerciseType,
  IUnit,
  IWeight,
  ISettings,
  IScreenMuscle,
  IIntervals,
} from "../types";
import { ICollectorFn } from "../utils/collector";
import {
  Reps_avgUnilateralCompletedReps,
  Reps_volume,
  Reps_isStarted,
  Reps_setVolume,
  Reps_isFinishedSet,
} from "./set";
import { ProgramExercise_isUsingVariable } from "./programExercise";
import { IState, updateState } from "./state";
import { lb, lbu } from "lens-shmens";
import { ObjectUtils_keys, ObjectUtils_clone } from "../utils/object";
import { IDispatch } from "../ducks/types";
import { SendMessage_toIosAndAndroid } from "../utils/sendMessage";
import memoize from "micro-memoize";
import { DateUtils_firstDayOfWeekTimestamp, DateUtils_formatYYYYMMDD } from "../utils/date";
import { IEvaluatedProgram, Program_getProgramExerciseForKeyAndDay } from "./program";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import { Muscle_getAvailableMuscleGroups } from "./muscle";

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

export function History_createCustomEntry(exerciseType: IExerciseType, index: number): IHistoryEntry {
  return {
    vtype: "history_entry",
    id: Progress_getEntryId(exerciseType),
    index,
    exercise: exerciseType,
    sets: [],
    warmupSets: [],
  };
}

export function History_finishProgramDay(
  progress: IHistoryRecord,
  settings: ISettings,
  day: number,
  program?: IEvaluatedProgram,
  forceEndTime: number = Date.now()
): IHistoryRecord {
  const { deletedProgramExercises, ui, ...historyRecord } = progress;
  const updatedAt = forceEndTime;
  const endTime = Progress_isCurrent(progress) ? forceEndTime : (progress.endTime ?? forceEndTime);
  return {
    ...historyRecord,
    entries: historyRecord.entries.map((entry) => {
      const programExercise =
        program && entry.programExerciseId
          ? Program_getProgramExerciseForKeyAndDay(program, day, entry.programExerciseId)
          : undefined;
      if (Progress_isCurrent(progress)) {
        const isUnilateral = Exercise_getIsUnilateral(entry.exercise, settings);
        entry = {
          ...entry,
          updatePrints: undefined,
          sets: entry.sets.map((set) => {
            return {
              ...set,
              completedReps: set.isCompleted ? set.completedReps : undefined,
              completedRepsLeft: isUnilateral && set.isCompleted ? set.completedRepsLeft : undefined,
              completedRpe: set.isCompleted ? set.completedRpe : undefined,
              completedWeight: set.isCompleted ? set.completedWeight : undefined,
            };
          }),
        };
        if (programExercise != null) {
          const state = PlannerProgramExercise.getState(programExercise);
          const useRm1 = ProgramExercise_isUsingVariable(programExercise, "rm1");
          entry = {
            ...entry,
            state: { ...state },
            vars: useRm1 ? { rm1: Exercise_onerm(programExercise.exerciseType, settings) } : {},
          };
        }
      }
      return entry;
    }),
    vtype: "history_record",
    id: Progress_isCurrent(progress) ? progress.startTime : progress.id,
    updatedAt: updatedAt,
    timerSince: undefined,
    timerMode: undefined,
    intervals: History_pauseWorkout(progress.intervals),
    ...(Progress_isCurrent(progress) ? { endTime } : {}),
  };
}

export function History_getMaxWeightSetFromEntry(entry: IHistoryEntry): ISet | undefined {
  return History_getMaxWeightSet(entry.sets);
}

export function History_getMax1RMSetFromEntry(entry: IHistoryEntry): ISet | undefined {
  return History_getMax1RMSet(entry.sets);
}

export function History_getMaxWeightSet(sets: ISet[]): ISet | undefined {
  return CollectionUtils_sort(
    sets.filter((s) => (s.completedReps || 0) > 0),
    (a, b) => {
      const weightDiff = Weight_compare(
        b.completedWeight ?? b.weight ?? Weight_build(0, "lb"),
        a.completedWeight ?? a.weight ?? Weight_build(0, "lb")
      );
      if (weightDiff === 0 && a.completedReps && b.completedReps) {
        return b.completedReps - a.completedReps;
      }
      return weightDiff;
    }
  )[0];
}

export function History_getMax1RMSet(sets: ISet[]): ISet | undefined {
  return CollectionUtils_sort(
    sets.filter((s) => (s.completedReps || 0) > 0),
    (a, b) => {
      const weightDiff = Weight_compare(
        Weight_getOneRepMax(
          b.completedWeight ?? b.weight ?? Weight_build(0, "lb"),
          Reps_avgUnilateralCompletedReps(b) || 0,
          b.completedRpe ?? b.rpe ?? 10
        ),
        Weight_getOneRepMax(
          a.completedWeight ?? a.weight ?? Weight_build(0, "lb"),
          Reps_avgUnilateralCompletedReps(a) || 0,
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

export function History_findAllPersonalRecords(
  record: IHistoryRecord,
  history: IHistoryRecord[]
): Map<IExerciseType, ISet> {
  const prs: Map<IExerciseType, ISet> = new Map();
  for (const entry of record.entries) {
    const set = History_findPersonalRecord(record.id, entry, history);
    if (set != null) {
      prs.set(entry.exercise, set);
    }
  }
  return prs;
}

export function History_findAllUsedExerciseTypes(history: IHistoryRecord[]): Partial<Record<string, IExerciseType>> {
  const set: Partial<Record<string, IExerciseType>> = {};
  for (const record of history) {
    for (const entry of record.entries) {
      set[Exercise_toKey(entry.exercise)] = entry.exercise;
    }
  }
  return set;
}

export function History_collectMinAndMaxTime(): ICollectorFn<IHistoryRecord, { minTime: number; maxTime: number }> {
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

export function History_collectProgramChangeTimes(): ICollectorFn<
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

export function History_collectMuscleGroups(
  settings: ISettings
): ICollectorFn<IHistoryRecord, Record<IScreenMuscle | "total", [number[], number[], number[]]>> {
  return {
    fn: (acc, hr) => {
      for (const entry of hr.entries) {
        const exercise = Exercise_get(entry.exercise, settings.exercises);
        const targetMuscleGroups = Exercise_targetMusclesGroups(exercise, settings);
        const synergistMuscleGroups = Exercise_synergistMusclesGroups(exercise, settings);
        const synergistMuscleGroupToMultiplier = Exercise_synergistMusclesGroupMultipliers(exercise, settings);
        for (const muscleGroup of [...Muscle_getAvailableMuscleGroups(settings), "total"] as const) {
          let multiplier = 0;
          if (muscleGroup === "total") {
            multiplier = 1;
          } else if (targetMuscleGroups.indexOf(muscleGroup) !== -1) {
            multiplier = 1;
          } else if (synergistMuscleGroups.indexOf(muscleGroup) !== -1) {
            multiplier = synergistMuscleGroupToMultiplier[muscleGroup] ?? settings.planner.synergistMultiplier;
          }
          if (multiplier === 0) {
            continue;
          }
          acc[muscleGroup] = acc[muscleGroup] || [[], [], []];
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
            const beginningOfWeekForDate = DateUtils_firstDayOfWeekTimestamp(date, settings.startWeekFromMonday);
            const beginningOfWeekForLastDate = DateUtils_firstDayOfWeekTimestamp(
              lastDate,
              settings.startWeekFromMonday
            );
            if (beginningOfWeekForDate !== beginningOfWeekForLastDate) {
              muscleGroupAcc[0].push(Math.round(date.getTime() / 1000));
              muscleGroupAcc[1].push(0);
              muscleGroupAcc[2].push(0);
            }
          }
          muscleGroupAcc[1][muscleGroupAcc[1].length - 1] +=
            Reps_volume(finishedSets, settings.units).value * multiplier;
          muscleGroupAcc[2][muscleGroupAcc[2].length - 1] += finishedSets.length * multiplier;
        }
      }
      return acc;
    },
    initial: {},
  };
}

export function History_collectAllUsedExerciseTypes(): ICollectorFn<
  IHistoryRecord,
  Partial<Record<string, IExerciseType>>
> {
  return {
    fn: (acc, hr) => {
      for (const entry of hr.entries) {
        acc[Exercise_toKey(entry.exercise)] = entry.exercise;
      }
      return acc;
    },
    initial: {},
  };
}

export function History_collectAllHistoryRecordsOfExerciseType(
  exerciseType: IExerciseType
): ICollectorFn<IHistoryRecord, IHistoryRecord[]> {
  return {
    fn: (acc, hr) => {
      const hasExercise = hr.entries.some((e) => Exercise_eq(e.exercise, exerciseType));
      if (hasExercise) {
        acc.push(hr);
      }
      return acc;
    },
    initial: [],
  };
}

export function History_collectLastEntry(
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
        const entry = hr.entries.find((e) => Exercise_eq(e.exercise, exerciseType) && Reps_isStarted(e.sets));
        if (entry) {
          acc = { lastHistoryEntry: entry, lastHistoryRecord: hr, timestamp: time };
        }
      }
      return acc;
    },
    initial: {},
  };
}

export function History_collectLastNote(
  startTime: number,
  exerciseType: IExerciseType
): ICollectorFn<IHistoryRecord, { lastNote?: string; timestamp?: number }> {
  return {
    fn: (acc, hr) => {
      const time = hr.endTime ?? hr.startTime;
      const twoMonthsAgo = startTime - 60 * 24 * 60 * 60 * 1000;
      if (time < startTime && time > twoMonthsAgo && (acc.timestamp == null || time > acc.timestamp)) {
        const entry = hr.entries.find((e) => Exercise_eq(e.exercise, exerciseType));
        if (entry && entry.notes) {
          acc = { lastNote: entry.notes, timestamp: time };
        }
      }
      return acc;
    },
    initial: {},
  };
}

export function History_collectWeightPersonalRecord(
  exerciseType: IExerciseType,
  unit: IUnit
): ICollectorFn<IHistoryRecord, { maxWeight: IWeight; maxWeightHistoryRecord?: IHistoryRecord }> {
  return {
    fn: (acc, hr) => {
      const entries = hr.entries.filter((e) => Exercise_eq(e.exercise, exerciseType));
      const maxSet = History_getMaxWeightSet(entries.flatMap((e) => e.sets));
      if (maxSet != null) {
        const weight = maxSet.completedWeight ?? maxSet.weight ?? Weight_build(0, unit);
        if (Weight_gt(weight, acc.maxWeight)) {
          acc = { maxWeight: weight, maxWeightHistoryRecord: hr };
        }
      }
      return acc;
    },
    initial: { maxWeight: Weight_build(0, unit) },
  };
}

export function History_collect1RMPersonalRecord(
  exerciseType: IExerciseType,
  settings: ISettings
): ICollectorFn<IHistoryRecord, { max1RM: IWeight; max1RMHistoryRecord?: IHistoryRecord; max1RMSet?: ISet }> {
  return {
    fn: (acc, hr) => {
      const entries = hr.entries.filter((e) => Exercise_eq(e.exercise, exerciseType));
      const allSets = entries.flatMap((e) => e.sets);
      const all1RMs = allSets.map<[ISet, IWeight]>((s) => [
        s,
        Weight_getOneRepMax(s.completedWeight ?? s.weight ?? Weight_build(0, settings.units), s.completedReps || 0),
      ]);
      const max1RM = CollectionUtils_sort(all1RMs, (a, b) => Weight_compare(b[1], a[1]))[0];
      if (max1RM != null && Weight_gt(max1RM[1], acc.max1RM)) {
        acc = { max1RM: max1RM[1], max1RMHistoryRecord: hr, max1RMSet: max1RM[0] };
      }
      return acc;
    },
    initial: { max1RM: Weight_build(0, settings.units) },
  };
}

export function History_findAllMaxSetsPerId(history: IHistoryRecord[]): Partial<Record<string, ISet>> {
  const maxSets: Partial<Record<string, ISet>> = {};
  for (const r of history) {
    for (const e of r.entries) {
      const entryMaxSet = History_getMaxWeightSetFromEntry(e);
      const key = Exercise_toKey(e.exercise);
      if (entryMaxSet != null && (entryMaxSet.completedReps || 0) > 0) {
        if (maxSets[key] == null || Weight_lt(maxSets[key].weight || 0, entryMaxSet.weight ?? Weight_build(0, "lb"))) {
          maxSets[key] = entryMaxSet;
        }
      }
    }
  }
  return maxSets;
}

export function History_getHistoryRecordsForTimerange(
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
    if (Progress_isCurrent(hr)) {
      return false;
    }
    const recordDate = Date.parse(hr.date);
    const startTime = new Date(recordDate);
    return startTime >= start && startTime < end;
  });
}

export function History_getNumberOfPersonalRecords(history: IHistoryRecord[], prs: IPersonalRecords): number {
  return history.reduce((memo, r) => {
    return memo + ObjectUtils_keys(prs[r.id] || {})?.length;
  }, 0);
}

export function History_findMaxSet(exerciseType: IExerciseType, history: IHistoryRecord[]): ISet | undefined {
  let maxSet: ISet | undefined = undefined;
  for (const r of history) {
    for (const e of r.entries) {
      if (Exercise_eq(e.exercise, exerciseType)) {
        const entryMaxSet = History_getMaxWeightSetFromEntry(e);
        if (entryMaxSet != null && (entryMaxSet.completedReps || 0) > 0) {
          if (
            maxSet == null ||
            Weight_gt(entryMaxSet.weight ?? Weight_build(0, "lb"), maxSet.weight ?? Weight_build(0, "lb"))
          ) {
            maxSet = entryMaxSet;
          }
        }
      }
    }
  }
  return maxSet;
}

export function History_findPersonalRecord(
  id: number,
  entry: IHistoryEntry,
  history: IHistoryRecord[]
): ISet | undefined {
  let isMax: boolean | undefined;
  const entryMaxSet = History_getMaxWeightSetFromEntry(entry);
  if (entryMaxSet != null && (entryMaxSet.completedReps || 0) > 0) {
    for (const r of history) {
      if (r.id < id) {
        for (const e of r.entries) {
          if (e.exercise.id === entry.exercise.id && e.exercise.equipment === entry.exercise.equipment) {
            if (isMax == null) {
              isMax = true;
            }
            const maxSet = History_getMaxWeightSetFromEntry(e);
            if (
              maxSet != null &&
              Weight_gte(maxSet.weight ?? Weight_build(0, "lb"), entryMaxSet.weight ?? Weight_build(0, "lb"))
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

export function History_totalRecordWeight(record: IHistoryRecord, unit: IUnit): IWeight {
  return record.entries.reduce((memo, e) => Weight_add(memo, History_totalEntryWeight(e, unit)), Weight_build(0, unit));
}

export function History_totalRecordReps(record: IHistoryRecord): number {
  return record.entries.reduce((memo, e) => memo + History_totalEntryReps(e), 0);
}

export function History_totalRecordSets(record: IHistoryRecord): number {
  return record.entries.reduce((memo, e) => memo + History_totalEntrySets(e), 0);
}

export function History_totalEntryWeight(entry: IHistoryEntry, unit: IUnit): IWeight {
  return entry.sets
    .filter((s) => (s.completedReps || 0) > 0)
    .reduce((memo, set) => Weight_add(memo, Reps_setVolume(set, unit)), Weight_build(0, unit));
}

export function History_totalEntryReps(entry: IHistoryEntry): number {
  return entry.sets.reduce((memo, set) => memo + (set.completedReps || 0), 0);
}

export function History_totalEntrySets(entry: IHistoryEntry): number {
  return History_getFinishedSets(entry).length;
}

export function History_getStartedEntries(record: IHistoryRecord): IHistoryEntry[] {
  return record.entries.filter((e) => e.sets.filter((s) => (s.completedReps || 0) > 0).length > 0);
}

export function History_getFinishedSets(entry: IHistoryEntry): ISet[] {
  return entry.sets.filter((s) => Reps_isFinishedSet(s));
}

export function History_getHistoricalSameDay(
  history: IHistoryRecord[],
  progress: IHistoryRecord,
  currentEntry: IHistoryEntry
): IHistoryRecordAndEntry | undefined {
  for (const record of history) {
    if (record.day === progress.day) {
      for (const entry of record.entries) {
        if (
          Exercise_eq(currentEntry.exercise, entry.exercise) &&
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

export function History_getHistoricalLastDay(
  history: IHistoryRecord[],
  currentEntry: IHistoryEntry
): IHistoryRecordAndEntry | undefined {
  for (const record of history) {
    for (const entry of record.entries) {
      if (
        Exercise_eq(currentEntry.exercise, entry.exercise) &&
        entry.sets.length > 0 &&
        entry.sets.some((s) => (s.completedReps || 0) > 0)
      ) {
        return { record, entry };
      }
    }
  }
  return undefined;
}

export function History_calories(historyRecord: IHistoryRecord): number {
  const timeMs = History_workoutTime(historyRecord);
  const minutes = Math.floor(timeMs / 60000);
  return minutes * 6;
}

export function History_getHistoricalAmrapSets(
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
      if (Exercise_eq(currentEntry.exercise, entry.exercise)) {
        for (const set of entry.sets) {
          if (
            set.isAmrap &&
            set.reps === nextSet.reps &&
            Weight_eq(set.weight ?? Weight_build(0, "lb"), nextSet.weight ?? Weight_build(0, "lb"))
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

export function History_exportAsCSV(history: IHistoryRecord[], settings: ISettings): (string | number | null)[][] {
  const lines: (string | number | null)[][] = [
    [
      "Workout DateTime",
      "Program",
      "Day Name",
      "Exercise",
      "Is Warmup Set?",
      "Required Reps",
      "Completed Reps",
      "Is AMRAP?",
      "Required RPE",
      "Completed RPE",
      "Log RPE?",
      "Required Weight Value",
      "Required Weight Unit",
      "Completed Weight Value",
      "Completed Weight Unit",
      "Ask Weight?",
      "Completed Reps Time",
      "Target Muscles",
      "Synergist Muscles",
      "Notes",
    ],
  ];

  for (const historyRecord of history) {
    for (const entry of historyRecord.entries) {
      const exercise = Exercise_get(entry.exercise, settings.exercises);
      for (const warmupSet of entry.warmupSets) {
        lines.push([
          historyRecord.date,
          historyRecord.programName,
          historyRecord.dayName,
          Exercise_fullName(exercise, settings),
          1,
          warmupSet.reps ?? null,
          warmupSet.completedReps ?? null,
          warmupSet.isAmrap ? 1 : 0,
          warmupSet.rpe ?? null,
          warmupSet.completedRpe ?? null,
          warmupSet.logRpe ? 1 : 0,
          warmupSet.weight?.value ?? null,
          warmupSet.weight?.unit ?? null,
          warmupSet.completedWeight?.value ?? null,
          warmupSet.completedWeight?.unit ?? null,
          warmupSet.askWeight ? 1 : 0,
          warmupSet.timestamp != null ? new Date(warmupSet.timestamp || 0).toISOString() : null,
          Exercise_targetMuscles(exercise, settings).join(","),
          Exercise_synergistMuscles(exercise, settings).join(","),
          entry.notes ?? "",
        ]);
      }
      for (const set of entry.sets) {
        lines.push([
          historyRecord.date,
          historyRecord.programName,
          historyRecord.dayName,
          Exercise_fullName(exercise, settings),
          0,
          set.reps ?? null,
          set.completedReps ?? null,
          set.isAmrap ? 1 : 0,
          set.rpe ?? null,
          set.completedRpe ?? null,
          set.logRpe ? 1 : 0,
          set.weight?.value ?? null,
          set.weight?.unit ?? null,
          set.completedWeight?.value ?? null,
          set.completedWeight?.unit ?? null,
          set.askWeight ? 1 : 0,
          set.timestamp != null ? new Date(set.timestamp || 0).toISOString() : null,
          Exercise_targetMuscles(exercise, settings).join(","),
          Exercise_synergistMuscles(exercise, settings).join(","),
          entry.notes ?? "",
        ]);
      }
    }
  }

  return lines;
}

export function History_pauseWorkoutAction(dispatch: IDispatch): void {
  const lensGetters = { progress: lb<IState>().p("storage").pi("progress").get() };
  SendMessage_toIosAndAndroid({ type: "pauseWorkout" });
  updateState(
    dispatch,
    [
      lbu<IState, typeof lensGetters>(lensGetters)
        .p("storage")
        .pi("progress")
        .i(0)
        .p("intervals")
        .recordModify((intervals, getters) => History_pauseWorkout(getters.progress?.[0].intervals)),
    ],
    "Pause workout"
  );
}

export function History_pauseWorkout(intervals?: IIntervals): IIntervals | undefined {
  if (intervals && !History_isPaused(intervals)) {
    const newIntervals = intervals ? ObjectUtils_clone(intervals) : [];
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

export function History_resumeWorkoutAction(
  dispatch: IDispatch,
  isPlayground: boolean,
  settings: ISettings,
  hasSubscription: boolean
): void {
  updateState(
    dispatch,
    [
      Progress_lbProgress().recordModify((progress) => {
        const intervals = History_resumeWorkout(progress, isPlayground, settings.timers.reminder, hasSubscription);
        return { ...progress, intervals };
      }),
    ],
    "Resume workout"
  );
}

export function History_isPaused(intervals?: IIntervals): boolean {
  return intervals ? intervals.length === 0 || intervals[intervals.length - 1][1] != null : false;
}

export function History_resumeWorkout(
  historyRecord: IHistoryRecord,
  isPlayground: boolean,
  reminder: number | undefined,
  hasSubscription: boolean
): IIntervals | undefined {
  const intervals = historyRecord.intervals;
  if (History_isPaused(intervals)) {
    const isStart = !intervals || intervals.length === 0;
    if (!isPlayground && Progress_isCurrent(historyRecord)) {
      SendMessage_toIosAndAndroid({
        type: "resumeWorkout",
        reminder: `${reminder || 0}`,
        isStart: isStart ? "true" : "false",
        hasSubscription: hasSubscription ? "true" : "false",
      });
    }
    const newIntervals = intervals ? ObjectUtils_clone(intervals) : [];
    newIntervals.push([Date.now(), undefined]);
    return newIntervals;
  } else {
    return intervals;
  }
}

export function History_workoutTime(historyRecord: IHistoryRecord): number {
  const intervals = historyRecord.intervals || [[historyRecord.startTime, historyRecord.endTime || Date.now()]];
  return intervals.reduce((memo, interval) => {
    return memo + ((interval[1] || Date.now()) - interval[0]);
  }, 0);
}

export const History_getDateToHistory = memoize(
  (history: IHistoryRecord[]): Partial<Record<string, IHistoryRecord>> => {
    return history.reduce<Partial<Record<string, IHistoryRecord>>>((memo, hr) => {
      memo[DateUtils_formatYYYYMMDD(hr.date)] = hr;
      return memo;
    }, {});
  },
  { maxSize: 10 }
);

export const History_getPersonalRecords = memoize(
  (history: IHistoryRecord[]): IPersonalRecords => {
    const result: IPersonalRecords = {};
    const sortedHistory = CollectionUtils_sortBy(history, "id");
    const max1RMSets: Partial<Record<string, ISet | undefined>> = {};
    const maxWeightSets: Partial<Record<string, ISet | undefined>> = {};
    for (const record of sortedHistory) {
      for (const entry of record.entries) {
        const key = Exercise_toKey(entry.exercise);

        const thisMaxWeightSet = History_getMaxWeightSetFromEntry(entry);
        const thisMaxWeight = thisMaxWeightSet
          ? (thisMaxWeightSet.completedWeight ?? thisMaxWeightSet.weight)
          : undefined;
        const lastMaxWeight = maxWeightSets[key]?.completedWeight ?? maxWeightSets[key]?.weight;
        if (thisMaxWeight != null && (lastMaxWeight == null || Weight_gt(thisMaxWeight, lastMaxWeight))) {
          const prevMaxWeightSet = maxWeightSets[key];
          maxWeightSets[key] = thisMaxWeightSet;
          result[record.id] = result[record.id] || {};
          result[record.id]![key] = result[record.id]![key] || {};
          result[record.id]![key]!.prevMaxWeightSet = prevMaxWeightSet;
          result[record.id]![key]!.maxWeightSet = thisMaxWeightSet;
        }

        const thisMax1RMSet = History_getMax1RMSetFromEntry(entry);
        const thisMax1RM = thisMax1RMSet
          ? Weight_getOneRepMax(
              thisMax1RMSet.completedWeight ?? thisMax1RMSet.weight ?? Weight_build(0, "lb"),
              Reps_avgUnilateralCompletedReps(thisMax1RMSet) || 0,
              thisMax1RMSet.completedRpe ?? thisMax1RMSet.rpe
            )
          : undefined;
        const lastMax1RMSet = max1RMSets[key];
        const lastMax1RM = lastMax1RMSet
          ? Weight_getOneRepMax(
              lastMax1RMSet.completedWeight ?? lastMax1RMSet.weight ?? Weight_build(0, "lb"),
              lastMax1RMSet ? Reps_avgUnilateralCompletedReps(lastMax1RMSet) || 0 : 0,
              lastMax1RMSet.completedRpe ?? lastMax1RMSet.rpe
            )
          : undefined;
        if (thisMax1RM != null && (lastMax1RM == null || Weight_gt(thisMax1RM, lastMax1RM))) {
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
