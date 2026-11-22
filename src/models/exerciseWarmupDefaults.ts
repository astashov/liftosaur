import { IExerciseType, IExerciseWarmupDefaultSet, IPercentage, ISettings, IWeight } from "../types";
import { IPlannerProgramExerciseWarmupSet } from "../pages/planner/models/types";
import { Exercise_get, Exercise_toKey, warmupValues } from "./exercise";
import { Weight_buildPct, Weight_print } from "./weight";
import { CollectionUtils_removeAt } from "../utils/collection";
import { MathUtils_roundFloat } from "../utils/math";

type IDefaultSet = IExerciseWarmupDefaultSet;

export type IExerciseWarmupDefaults =
  | { state: "builtin"; sets: IDefaultSet[] }
  | { state: "custom"; sets: IDefaultSet[] }
  | { state: "none" };

const NEW_WARMUP_SET: IDefaultSet = { numberOfSets: 1, reps: 5, percentage: 50 };

function builtinSets(exerciseType: IExerciseType, settings: ISettings): IDefaultSet[] {
  const exercise = Exercise_get(exerciseType, settings.exercises);
  const rows = (exercise.defaultWarmup != null ? warmupValues(settings.units)[exercise.defaultWarmup] : []) ?? [];
  return rows.map((row) => ({
    numberOfSets: 1,
    reps: row.reps,
    ...(typeof row.value === "number"
      ? { percentage: MathUtils_roundFloat(row.value * 100, 2) }
      : { weight: row.value }),
    threshold: row.threshold,
  }));
}

function degroup(sets: IDefaultSet[]): IDefaultSet[] {
  return sets.flatMap((set) => Array.from({ length: set.numberOfSets }, () => ({ ...set, numberOfSets: 1 })));
}

function updateAt(sets: IDefaultSet[], index: number, fn: (set: IDefaultSet) => IDefaultSet): IDefaultSet[] {
  return sets.map((set, i) => (i === index ? fn(set) : set));
}

export function ExerciseWarmupDefaults_get(
  exerciseType: IExerciseType,
  settings: ISettings,
  warmups: IDefaultSet[] | undefined
): IExerciseWarmupDefaults {
  if (warmups == null) {
    return { state: "builtin", sets: builtinSets(exerciseType, settings) };
  }
  return warmups.length === 0 ? { state: "none" } : { state: "custom", sets: degroup(warmups) };
}

export function ExerciseWarmupDefaults_displaySets(
  exerciseType: IExerciseType,
  settings: ISettings
): IPlannerProgramExerciseWarmupSet[] {
  const warmups = settings.exerciseData[Exercise_toKey(exerciseType)]?.warmups;
  const defaults = ExerciseWarmupDefaults_get(exerciseType, settings, warmups);
  return defaults.state === "none" ? [] : defaults.sets.map(({ threshold, ...set }) => ({ ...set, type: "warmup" }));
}

export function ExerciseWarmupDefaults_setText(set: IDefaultSet): string {
  const value =
    set.percentage != null ? `${set.percentage}%` : set.weight != null ? Weight_print(set.weight) : undefined;
  return value != null ? `${set.reps} × ${value}` : `${set.reps} reps`;
}

export function ExerciseWarmupDefaults_thresholdLabel(set: IDefaultSet): string | undefined {
  return set.threshold != null ? `skip if first set ≤ ${Weight_print(set.threshold)}` : undefined;
}

export function ExerciseWarmupDefaults_customize(exerciseType: IExerciseType, settings: ISettings): IDefaultSet[] {
  const sets = builtinSets(exerciseType, settings);
  return sets.length === 0 ? [NEW_WARMUP_SET] : sets;
}

export function ExerciseWarmupDefaults_addSet(sets: IDefaultSet[]): IDefaultSet[] {
  const last = sets[sets.length - 1];
  return [...sets, last != null ? { ...last, numberOfSets: 1 } : NEW_WARMUP_SET];
}

export function ExerciseWarmupDefaults_removeSet(sets: IDefaultSet[], index: number): IDefaultSet[] {
  return CollectionUtils_removeAt(sets, index);
}

export function ExerciseWarmupDefaults_changeReps(
  sets: IDefaultSet[],
  index: number,
  reps: number | undefined
): IDefaultSet[] | undefined {
  if (reps == null || isNaN(reps)) {
    return undefined;
  }
  return updateAt(sets, index, (set) => ({ ...set, reps }));
}

export function ExerciseWarmupDefaults_changeWeight(
  sets: IDefaultSet[],
  index: number,
  value: IWeight | IPercentage | undefined
): IDefaultSet[] | undefined {
  if (value == null) {
    return undefined;
  }
  return updateAt(sets, index, ({ weight, percentage, ...set }) =>
    value.unit === "%" ? { ...set, percentage: value.value } : { ...set, weight: value }
  );
}

export function ExerciseWarmupDefaults_changeTimer(
  sets: IDefaultSet[],
  index: number,
  timer: number | undefined
): IDefaultSet[] {
  return updateAt(sets, index, ({ timer: _, ...set }) => (timer != null && !isNaN(timer) ? { ...set, timer } : set));
}

export function ExerciseWarmupDefaults_changeThreshold(
  sets: IDefaultSet[],
  index: number,
  threshold: IWeight | IPercentage | undefined
): IDefaultSet[] {
  return updateAt(sets, index, ({ threshold: _, ...set }) =>
    threshold != null && threshold.unit !== "%" && threshold.value > 0 ? { ...set, threshold } : set
  );
}

export function ExerciseWarmupDefaults_weightInputValue(set: IDefaultSet): IWeight | IPercentage | undefined {
  return set.percentage != null ? Weight_buildPct(set.percentage) : set.weight;
}

export function ExerciseWarmupDefaults_write(
  exerciseData: ISettings["exerciseData"],
  exerciseType: IExerciseType,
  warmups: IDefaultSet[] | undefined
): ISettings["exerciseData"] {
  const key = Exercise_toKey(exerciseType);
  const { [key]: current, ...rest } = exerciseData;
  const { warmups: _, ...others } = current ?? {};
  const next = warmups != null ? { ...others, warmups } : others;
  return Object.keys(next).length === 0 ? rest : { ...rest, [key]: next };
}
