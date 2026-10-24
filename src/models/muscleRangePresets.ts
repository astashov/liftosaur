import { IPlannerSettings } from "../types";
import { Muscle_groupsWithDefaultRange } from "./muscle";

export type IMuscleRangePreset = "low" | "moderate" | "high";

export const MuscleRangePresets_all: IMuscleRangePreset[] = ["low", "moderate", "high"];

// Fractional weekly-set tiers from Pelland et al. 2024; see lambda/scripts/plans/20261022-muscle-groups-split.md.
const presetRanges: Record<IMuscleRangePreset, [number, number]> = {
  low: [4, 10],
  moderate: [10, 18],
  high: [18, 30],
};

// Remmert et al. 2025: growth stops improving measurably past about 11 fractional sets per session.
const maxSetsPerSession = 11;
const minFrequency = 2;

export function MuscleRangePresets_range(preset: IMuscleRangePreset): [number, number] {
  const [min, max] = presetRanges[preset];
  return [min, max];
}

export function MuscleRangePresets_frequency(maxWeeklySets: number): number {
  return Math.max(minFrequency, Math.ceil(maxWeeklySets / maxSetsPerSession));
}

export function MuscleRangePresets_apply(planner: IPlannerSettings, preset: IMuscleRangePreset): IPlannerSettings {
  const range = MuscleRangePresets_range(preset);
  const frequency = MuscleRangePresets_frequency(range[1]);
  const weeklyRangeSets = { ...planner.weeklyRangeSets };
  const weeklyFrequency = { ...planner.weeklyFrequency };
  for (const muscleGroup of Muscle_groupsWithDefaultRange) {
    weeklyRangeSets[muscleGroup] = [range[0], range[1]];
    weeklyFrequency[muscleGroup] = frequency;
  }
  return { ...planner, weeklyRangeSets, weeklyFrequency };
}

export function MuscleRangePresets_current(planner: IPlannerSettings): IMuscleRangePreset | undefined {
  return MuscleRangePresets_all.find((preset) => {
    const [min, max] = presetRanges[preset];
    const frequency = MuscleRangePresets_frequency(max);
    return Muscle_groupsWithDefaultRange.every((muscleGroup) => {
      const range = planner.weeklyRangeSets[muscleGroup];
      return range?.[0] === min && range[1] === max && planner.weeklyFrequency[muscleGroup] === frequency;
    });
  });
}
