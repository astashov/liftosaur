import { IPlannerSettings, IScreenMuscle } from "../types";
import { IEither } from "../utils/types";

export type IRangeBound = "min" | "max";

export function MuscleGroupSettings_parseNumber<E>(
  e: IEither<string, E>,
  min?: number,
  max?: number,
  isInt: boolean = true
): number | undefined {
  if (!e.success) {
    return undefined;
  }
  const value = isInt ? parseInt(e.data, 10) : parseFloat(e.data);
  if (isNaN(value)) {
    return undefined;
  }
  let clamped = value;
  if (min != null) {
    clamped = Math.max(min, clamped);
  }
  if (max != null) {
    clamped = Math.min(max, clamped);
  }
  return clamped;
}

export function MuscleGroupSettings_withBound(
  range: [number, number] | undefined,
  bound: IRangeBound,
  value: number
): [number, number] {
  if (bound === "min") {
    return [value, range ? range[1] : value];
  }
  return [range ? range[0] : 0, value];
}

export function MuscleGroupSettings_rangedGroups(
  planner: IPlannerSettings,
  muscleGroups: IScreenMuscle[]
): IScreenMuscle[] {
  return muscleGroups.filter((muscleGroup) => planner.weeklyRangeSets[muscleGroup] != null);
}

export function MuscleGroupSettings_setAllBound(
  planner: IPlannerSettings,
  muscleGroups: IScreenMuscle[],
  bound: IRangeBound,
  value: number
): IPlannerSettings["weeklyRangeSets"] {
  const weeklyRangeSets = { ...planner.weeklyRangeSets };
  for (const muscleGroup of MuscleGroupSettings_rangedGroups(planner, muscleGroups)) {
    weeklyRangeSets[muscleGroup] = MuscleGroupSettings_withBound(weeklyRangeSets[muscleGroup], bound, value);
  }
  return weeklyRangeSets;
}

export function MuscleGroupSettings_setAllFrequency(
  planner: IPlannerSettings,
  muscleGroups: IScreenMuscle[],
  value: number
): IPlannerSettings["weeklyFrequency"] {
  const weeklyFrequency = { ...planner.weeklyFrequency };
  for (const muscleGroup of MuscleGroupSettings_rangedGroups(planner, muscleGroups)) {
    weeklyFrequency[muscleGroup] = value;
  }
  return weeklyFrequency;
}

export interface IMuscleGroupSettingsSummary {
  min?: number;
  max?: number;
  frequency?: number;
}

function sameValue(values: (number | undefined)[]): number | undefined {
  const first = values[0];
  return values.every((value) => value === first) ? first : undefined;
}

export function MuscleGroupSettings_summary(
  planner: IPlannerSettings,
  muscleGroups: IScreenMuscle[]
): IMuscleGroupSettingsSummary {
  const ranged = MuscleGroupSettings_rangedGroups(planner, muscleGroups);
  return {
    min: sameValue(ranged.map((muscleGroup) => planner.weeklyRangeSets[muscleGroup]?.[0])),
    max: sameValue(ranged.map((muscleGroup) => planner.weeklyRangeSets[muscleGroup]?.[1])),
    frequency: sameValue(ranged.map((muscleGroup) => planner.weeklyFrequency[muscleGroup])),
  };
}
