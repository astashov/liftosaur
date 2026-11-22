import {
  IExerciseType,
  IExerciseWarmupDefaultSet,
  IHistoryEntry,
  ISet,
  ISettings,
  IWarmupSchemeSet,
  IWeight,
} from "../types";
import { Exercise_get, Exercise_getIsUnilateral, Exercise_toKey, warmupValues } from "./exercise";
import {
  Weight_build,
  Weight_eqNull,
  Weight_gt,
  Weight_multiply,
  Weight_roundWarmup,
  Weight_rpeMultiplier,
} from "./weight";
import { Equipment_getUnitOrDefaultForExerciseType } from "./equipment";
import { MathUtils_roundTo0005 } from "../utils/math";
import { UidFactory_generateUid } from "../utils/generator";
import { Reps_addSet } from "./set";

export interface IWarmupSchemeRow {
  reps: number;
  value: IWeight | number;
  timer?: number;
  threshold?: IWeight;
}

export interface IWarmupPrescription {
  reps: number;
  weight: IWeight;
  originalWeight: IWeight;
  timer?: number;
}

function WarmupScheme_rowsFromSets(sets: IExerciseWarmupDefaultSet[]): IWarmupSchemeRow[] {
  const rows: IWarmupSchemeRow[] = [];
  for (const set of sets) {
    const value =
      set.percentage != null
        ? set.percentage / 100
        : (set.weight ?? MathUtils_roundTo0005(Weight_rpeMultiplier(set.reps, 4, "rts")));
    for (let i = 0; i < set.numberOfSets; i += 1) {
      rows.push({
        reps: set.reps,
        value,
        ...(set.timer != null ? { timer: set.timer } : {}),
        ...(set.threshold != null ? { threshold: set.threshold } : {}),
      });
    }
  }
  return rows;
}

export function WarmupScheme_resolve(
  exerciseType: IExerciseType,
  settings: ISettings,
  programWarmups: IWarmupSchemeSet[] | undefined
): IWarmupSchemeRow[] {
  if (programWarmups != null) {
    return WarmupScheme_rowsFromSets(programWarmups);
  }
  const userDefault = settings.exerciseData[Exercise_toKey(exerciseType)]?.warmups;
  if (userDefault != null) {
    return WarmupScheme_rowsFromSets(userDefault);
  }
  const exercise = Exercise_get(exerciseType, settings.exercises);
  const builtin = (exercise.defaultWarmup != null ? warmupValues(settings.units)[exercise.defaultWarmup] : []) ?? [];
  return builtin.map((set) => ({ reps: set.reps, value: set.value, threshold: set.threshold }));
}

export function WarmupScheme_prescribe(
  rows: IWarmupSchemeRow[],
  firstWeight: IWeight | undefined,
  exerciseType: IExerciseType,
  settings: ISettings
): IWarmupPrescription[] {
  const unit = Equipment_getUnitOrDefaultForExerciseType(settings, exerciseType);
  const prescription: IWarmupPrescription[] = [];
  for (const row of rows) {
    if (row.threshold != null && (firstWeight == null || !Weight_gt(firstWeight, row.threshold))) {
      continue;
    }
    const value = row.value;
    if (typeof value === "number") {
      const isLessAssistance = firstWeight != null && firstWeight.value < 0 && value < 1;
      if (firstWeight == null || isLessAssistance) {
        continue;
      }
    }
    const originalWeight = typeof value === "number" ? Weight_multiply(firstWeight!, value) : value;
    const weight = Weight_roundWarmup(originalWeight, settings, unit, exerciseType, firstWeight);
    prescription.push({ reps: row.reps, weight, originalWeight, timer: row.timer });
  }
  return prescription;
}

export function WarmupScheme_materialize(
  prescription: IWarmupPrescription[],
  oldSets: ISet[],
  isUnilateral: boolean
): ISet[] {
  return prescription.map((p, index) => ({
    vtype: "set",
    index,
    id: oldSets[index]?.id ?? UidFactory_generateUid(6),
    reps: p.reps,
    isUnilateral,
    weight: p.weight,
    originalWeight: p.originalWeight,
    ...(p.timer != null ? { timer: p.timer } : {}),
    isCompleted: false,
  }));
}

export function WarmupScheme_addSet(warmupSets: ISet[], exerciseType: IExerciseType, settings: ISettings): ISet[] {
  const added = Reps_addSet(warmupSets, Exercise_getIsUnilateral(exerciseType, settings), undefined, true);
  if (warmupSets.length > 0) {
    return added;
  }
  const unit = Equipment_getUnitOrDefaultForExerciseType(settings, exerciseType);
  const emptyBar = Weight_roundWarmup(Weight_build(0, unit), settings, unit, exerciseType, undefined);
  if (emptyBar.value <= 0) {
    return added;
  }
  return added.map((set) => ({ ...set, weight: emptyBar, originalWeight: emptyBar }));
}

export function WarmupScheme_reconcile(
  before: IHistoryEntry,
  after: IHistoryEntry,
  programWarmups: IWarmupSchemeSet[] | undefined,
  settings: ISettings,
  didScriptWriteWarmups: boolean
): IHistoryEntry {
  if (
    didScriptWriteWarmups ||
    after.warmupSets.some((set) => set.isCompleted) ||
    Weight_eqNull(before.sets[0]?.weight, after.sets[0]?.weight)
  ) {
    return after;
  }
  const warmupSets = WarmupScheme_build(
    after.exercise,
    after.sets[0]?.weight,
    settings,
    programWarmups,
    after.warmupSets
  );
  return { ...after, warmupSets };
}

export function WarmupScheme_build(
  exerciseType: IExerciseType,
  firstWeight: IWeight | undefined,
  settings: ISettings,
  programWarmups: IWarmupSchemeSet[] | undefined,
  oldSets: ISet[] = []
): ISet[] {
  const rows = WarmupScheme_resolve(exerciseType, settings, programWarmups);
  const prescription = WarmupScheme_prescribe(rows, firstWeight, exerciseType, settings);
  return WarmupScheme_materialize(prescription, oldSets, Exercise_getIsUnilateral(exerciseType, settings));
}
