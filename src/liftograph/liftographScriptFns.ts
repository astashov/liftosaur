import { IScriptFunctionTable } from "../liftoscriptFns";
import {
  LiftoscriptExerciseName_isExercise,
  LiftoscriptExerciseName_isProgramExercise,
} from "../liftoscriptExerciseName";
import { Progress_createScriptFunctions } from "../models/progress";
import { Weight_build, Weight_divide, Weight_is, Weight_isPct, Weight_lt, Weight_op } from "../models/weight";
import { Muscle_getAvailableMuscleGroups } from "../models/muscle";
import { IHistoryEntry, IHistoryRecord, IPercentage, ISettings, IWeight } from "../types";
import { ILiftographMuscleGroupTotals, LiftographMeasures_muscleGroups } from "./liftographMeasures";
import { ILiftographRow } from "./liftographRows";

export type ILiftographPointValue = number | IWeight;

export interface ILiftographRawPoint {
  x?: ILiftographPointValue;
  y: ILiftographPointValue;
}

export interface ILiftographScriptFns {
  fns: IScriptFunctionTable;
  beginRow: (row: ILiftographRow) => void;
  takePoints: () => ILiftographRawPoint[];
}

type IAggregateItem = number | IWeight | IPercentage;

function isAggregateItem(value: unknown): value is IAggregateItem {
  return typeof value === "number" || Weight_is(value) || Weight_isPct(value);
}

function flatten(args: unknown[]): IAggregateItem[] {
  const result: IAggregateItem[] = [];
  for (const arg of args) {
    for (const item of Array.isArray(arg) ? arg : [arg]) {
      if (isAggregateItem(item)) {
        result.push(item);
      }
    }
  }
  return result;
}

function sumOf(items: IAggregateItem[]): IAggregateItem {
  return items.reduce<IAggregateItem>((acc, item) => Weight_op(undefined, acc, item, (a, b) => a + b), 0);
}

function pointValue(value: unknown): ILiftographPointValue | undefined {
  return typeof value === "number" || Weight_is(value) ? value : undefined;
}

export function LiftographScriptFns_muscleGroupKeys(settings: ISettings): Set<string> {
  return new Set<string>(["total", ...Muscle_getAvailableMuscleGroups(settings)]);
}

export function LiftographScriptFns_create(
  settings: ISettings,
  recordMuscleGroups: (record: IHistoryRecord) => ILiftographMuscleGroupTotals = (record) =>
    LiftographMeasures_muscleGroups(record, settings)
): ILiftographScriptFns {
  const progressFns = Progress_createScriptFunctions(settings);
  let row: ILiftographRow | undefined;
  let points: ILiftographRawPoint[] = [];
  let muscleGroups: Partial<Record<string, { sets: number; volume: IWeight }>> | undefined;
  let setEntries: IHistoryEntry[] = [];

  const muscleGroupKeys = LiftographScriptFns_muscleGroupKeys(settings);

  function muscleGroup(group: string): { sets: number; volume: IWeight } | undefined {
    if (!muscleGroupKeys.has(group)) {
      throw new Error(`Unknown muscle group "${group}"`);
    }
    if (muscleGroups == null) {
      muscleGroups = row?.type === "workout" ? recordMuscleGroups(row.record) : {};
    }
    return muscleGroups[group];
  }

  function entryOfSet(index: number): IHistoryEntry {
    const entry = setEntries[index - 1];
    if (entry == null) {
      throw new Error(`Set ${index} is out of range, this workout has ${setEntries.length} sets`);
    }
    return entry;
  }

  const fns: IScriptFunctionTable = {
    floor: progressFns.floor,
    ceil: progressFns.ceil,
    round: progressFns.round,
    calculate1RM: progressFns.calculate1RM,
    rpeMultiplier: progressFns.rpeMultiplier,
    max: (args) => {
      const items = flatten(args);
      return items.length === 0 ? undefined : items.reduce((acc, item) => (Weight_lt(acc, item) ? item : acc));
    },
    min: (args) => {
      const items = flatten(args);
      return items.length === 0 ? undefined : items.reduce((acc, item) => (Weight_lt(item, acc) ? item : acc));
    },
    sum: (args) => sumOf(flatten(args)),
    count: (args) => flatten(args).length,
    avg: (args) => {
      const items = flatten(args);
      if (items.length === 0) {
        return undefined;
      }
      const total = sumOf(items);
      return Weight_is(total)
        ? Weight_divide(total, items.length)
        : typeof total === "number"
          ? total / items.length
          : total;
    },
    point: (args) => {
      const [first, second] = args;
      const x = args.length > 1 ? pointValue(first) : undefined;
      const y = pointValue(args.length > 1 ? second : first);
      if (y == null || (args.length > 1 && x == null)) {
        return 0;
      }
      points.push(x != null ? { x, y } : { y });
      return 0;
    },
    programState: ([name]) => {
      if (row?.type !== "exercise") {
        return undefined;
      }
      return row.entry.state?.[name];
    },
    isExercise: ([pattern]) => {
      return row?.type === "exercise"
        ? LiftoscriptExerciseName_isExercise(pattern, row.entry.exercise, settings.exercises)
        : false;
    },
    isProgramExercise: ([pattern]) => {
      const key = row?.type === "exercise" ? row.entry.programExerciseId : undefined;
      return key != null ? LiftoscriptExerciseName_isProgramExercise(pattern, key, settings.exercises) : false;
    },
    muscleSets: ([group]) => muscleGroup(group)?.sets ?? 0,
    muscleVolume: ([group]) => muscleGroup(group)?.volume ?? Weight_build(0, settings.units),
    isSetExercise: ([index, pattern]) =>
      LiftoscriptExerciseName_isExercise(pattern, entryOfSet(index).exercise, settings.exercises),
    isSetProgramExercise: ([index, pattern]) => {
      const key = entryOfSet(index).programExerciseId;
      return key != null ? LiftoscriptExerciseName_isProgramExercise(pattern, key, settings.exercises) : false;
    },
  };

  return {
    fns,
    beginRow: (nextRow) => {
      row = nextRow;
      points = [];
      muscleGroups = undefined;
      setEntries = nextRow.type === "workout" ? nextRow.record.entries.flatMap((e) => e.sets.map(() => e)) : [];
    },
    takePoints: () => {
      const taken = points;
      points = [];
      return taken;
    },
  };
}
