import { IMuscle, IPlannerSettings, IScreenMuscle } from "../types";
import { ObjectUtils_keys } from "../utils/object";
import { IMusclePoints } from "./ungroupedMuscles";

export interface IMuscleRangeStatus {
  colorClass: string;
  direction: string;
}

export function MuscleRangeDisplay_pctColor(total: number, num: number, target: number): string {
  const pct = total > 0 ? Math.round((num * 100) / total) : 0;
  if (pct >= target) {
    return "text-text-success";
  } else if (pct >= target - 10) {
    return "text-icon-yellow";
  } else {
    return "text-text-error";
  }
}

export function MuscleRangeDisplay_status(value: number, range: [number, number] | undefined): IMuscleRangeStatus {
  if (range == null) {
    return { colorClass: "", direction: "" };
  }
  const [min, max] = range;
  let colorClass = "text-text-error";
  if (value >= min && value <= max) {
    colorClass = "text-text-success";
  } else if (value >= min * 0.7 && value <= max * 1.3) {
    colorClass = "text-icon-yellow";
  }
  const direction = value < min ? "↑" : value > max ? "↓" : "";
  return { colorClass, direction };
}

export function MuscleRangeDisplay_frequencyColor(value: number, threshold: number | undefined): string {
  if (threshold == null) {
    return "";
  }
  if (value >= threshold) {
    return "text-text-success";
  } else if (value >= threshold * 0.5) {
    return "text-icon-yellow";
  } else {
    return "text-text-error";
  }
}

export interface IMuscleWeekIntensities {
  groups: Partial<Record<IScreenMuscle, number>>;
  ungroupedMuscles: IMusclePoints;
}

export function MuscleRangeDisplay_weekIntensities(
  splits: Partial<Record<IScreenMuscle, { strength: number; hypertrophy: number }>>,
  ungroupedMuscleSets: IMusclePoints,
  planner: IPlannerSettings
): IMuscleWeekIntensities {
  const totals = ObjectUtils_keys(splits).map((muscleGroup): [IScreenMuscle, number] => {
    const split = splits[muscleGroup];
    return [muscleGroup, (split?.strength ?? 0) + (split?.hypertrophy ?? 0)];
  });
  const largestRangeMax = Math.max(0, ...totals.map(([muscleGroup]) => planner.weeklyRangeSets[muscleGroup]?.[1] ?? 0));
  const largestTotal = Math.max(
    0,
    ...totals.map(([, total]) => total),
    ...Object.values(ungroupedMuscleSets).map((sets) => sets ?? 0)
  );
  const unrangedScale = largestRangeMax > 0 ? largestRangeMax : largestTotal;
  const groups: Partial<Record<IScreenMuscle, number>> = {};
  for (const [muscleGroup, total] of totals) {
    groups[muscleGroup] = MuscleRangeDisplay_intensity(total, planner.weeklyRangeSets[muscleGroup], unrangedScale);
  }
  const ungroupedMuscles: IMusclePoints = {};
  for (const muscle of Object.keys(ungroupedMuscleSets) as IMuscle[]) {
    ungroupedMuscles[muscle] = MuscleRangeDisplay_intensity(ungroupedMuscleSets[muscle] ?? 0, undefined, unrangedScale);
  }
  return { groups, ungroupedMuscles };
}

export function MuscleRangeDisplay_intensity(
  value: number,
  range: [number, number] | undefined,
  unrangedScale: number
): number {
  const scale = range != null && range[1] > 0 ? range[1] : unrangedScale;
  if (scale <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, value / scale));
}
