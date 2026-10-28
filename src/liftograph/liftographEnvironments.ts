import { ILiftoscriptEnvironment } from "../liftoscriptEnvironment";
import { IScriptFnName, IScriptStaticType } from "../liftoscriptFns";
import { Exercise_fullName, Exercise_get, Exercise_toKey } from "../models/exercise";
import { Weight_add, Weight_build, Weight_is } from "../models/weight";
import { IHistoryEntry, IHistoryRecord, ISet, ISettings, IWeight } from "../types";
import {
  ILiftographBodyweightPoint,
  LiftographMeasures_bodyweightAt,
  LiftographMeasures_entryVolume,
  LiftographMeasures_setE1rm,
  LiftographMeasures_setWeight,
  LiftographMeasures_workoutDuration,
} from "./liftographMeasures";
import { ILiftographRow } from "./liftographRows";

export type ILiftographSetBindings = {
  weights: (IWeight | undefined)[];
  completedWeights: (IWeight | undefined)[];
  e1rm: (IWeight | undefined)[];
  reps: (number | undefined)[];
  minReps: (number | undefined)[];
  completedReps: (number | undefined)[];
  RPE: (number | undefined)[];
  completedRPE: (number | undefined)[];
  numberOfSets: number;
  completedNumberOfSets: number;
  day: number;
  week: number;
  dayInWeek: number;
  volume: IWeight;
  bodyweight: IWeight | undefined;
};

export type ILiftographExerciseBindings = ILiftographSetBindings & { exercise: string; rm1: IWeight | undefined };

export type ILiftographWorkoutBindings = ILiftographSetBindings & { duration: number | undefined; exercises: number };

export type ILiftographStatsBindings = { value: number | IWeight; bodyweight: IWeight | undefined };

export type ILiftographBindings = ILiftographExerciseBindings | ILiftographWorkoutBindings | ILiftographStatsBindings;

export interface ILiftographBindingContext {
  settings: ISettings;
  bodyweights: ILiftographBodyweightPoint[];
}

const LOOP_STEP_BUDGET = 10000;

const commonFnNames: IScriptFnName[] = [
  "max",
  "min",
  "sum",
  "avg",
  "count",
  "floor",
  "ceil",
  "round",
  "calculate1RM",
  "rpeMultiplier",
  "point",
];

const setIndexable = ["weights", "completedWeights", "e1rm", "reps", "minReps", "completedReps", "RPE", "completedRPE"];

const setTypes: Record<string, IScriptStaticType> = {
  weights: "array",
  completedWeights: "array",
  e1rm: "array",
  reps: "array",
  minReps: "array",
  completedReps: "array",
  RPE: "array",
  completedRPE: "array",
  numberOfSets: "number",
  completedNumberOfSets: "number",
  day: "number",
  week: "number",
  dayInWeek: "number",
  volume: "weight",
  bodyweight: "weight",
};

export const LiftographEnvironment_exercise: ILiftoscriptEnvironment = {
  id: "dashboard-exercise",
  fnNames: new Set<IScriptFnName>([...commonFnNames, "isExercise", "isProgramExercise", "programState"]),
  indexableBindings: new Set(setIndexable),
  bindingTypes: { ...setTypes, exercise: "string", rm1: "weight" },
  loopStepBudget: LOOP_STEP_BUDGET,
};

export const LiftographEnvironment_workout: ILiftoscriptEnvironment = {
  id: "dashboard-workout",
  fnNames: new Set<IScriptFnName>([
    ...commonFnNames,
    "muscleSets",
    "muscleVolume",
    "isSetExercise",
    "isSetProgramExercise",
  ]),
  indexableBindings: new Set(setIndexable),
  bindingTypes: { ...setTypes, duration: "number", exercises: "number" },
  loopStepBudget: LOOP_STEP_BUDGET,
};

export const LiftographEnvironment_stats: ILiftoscriptEnvironment = {
  id: "dashboard-stats",
  fnNames: new Set<IScriptFnName>(commonFnNames),
  indexableBindings: new Set(),
  bindingTypes: { value: "number", bodyweight: "weight" },
  loopStepBudget: LOOP_STEP_BUDGET,
};

export function LiftographEnvironment_forSource(type: ILiftographRow["type"]): ILiftoscriptEnvironment {
  return type === "exercise"
    ? LiftographEnvironment_exercise
    : type === "workout"
      ? LiftographEnvironment_workout
      : LiftographEnvironment_stats;
}

function setBindings(
  sets: ISet[],
  record: IHistoryRecord,
  volume: IWeight,
  context: ILiftographBindingContext,
  ts: number
): ILiftographSetBindings {
  const unit = context.settings.units;
  return {
    weights: sets.map((set) => set.weight),
    completedWeights: sets.map((set) => LiftographMeasures_setWeight(set)),
    e1rm: sets.map((set) => LiftographMeasures_setE1rm(set, unit)),
    reps: sets.map((set) => set.reps),
    minReps: sets.map((set) => set.minReps ?? set.reps),
    completedReps: sets.map((set) => set.completedReps),
    RPE: sets.map((set) => set.rpe),
    completedRPE: sets.map((set) => set.completedRpe),
    numberOfSets: sets.length,
    completedNumberOfSets: sets.filter((set) => set.isCompleted).length,
    day: record.day,
    week: record.week ?? 1,
    dayInWeek: record.dayInWeek ?? record.day,
    volume,
    bodyweight: LiftographMeasures_bodyweightAt(context.bodyweights, ts),
  };
}

export function LiftographEnvironment_entryLabel(entry: IHistoryEntry): string | undefined {
  const key = Exercise_toKey(entry.exercise).toLowerCase();
  const id = entry.programExerciseId;
  if (id == null || !id.endsWith(`-${key}`)) {
    return undefined;
  }
  return id.slice(0, id.length - key.length - 1);
}

export function LiftographEnvironment_bindings(
  row: ILiftographRow,
  context: ILiftographBindingContext
): ILiftographBindings {
  if (row.type === "stats") {
    return { value: row.value, bodyweight: LiftographMeasures_bodyweightAt(context.bodyweights, row.ts) };
  }
  if (row.type === "exercise") {
    const { entry, record } = row;
    const rm1 = entry.vars?.rm1;
    const exercise = Exercise_get(entry.exercise, context.settings.exercises);
    return {
      ...setBindings(entry.sets, record, LiftographMeasures_entryVolume(entry, context.settings), context, row.ts),
      exercise: Exercise_fullName(exercise, context.settings, LiftographEnvironment_entryLabel(entry)),
      rm1: Weight_is(rm1) ? rm1 : undefined,
    };
  }
  const { record } = row;
  const sets = record.entries.flatMap((entry) => entry.sets);
  const volume = record.entries.reduce(
    (memo, entry) => Weight_add(memo, LiftographMeasures_entryVolume(entry, context.settings)),
    Weight_build(0, context.settings.units)
  );
  return {
    ...setBindings(sets, record, volume, context, row.ts),
    duration: LiftographMeasures_workoutDuration(record),
    exercises: record.entries.length,
  };
}
