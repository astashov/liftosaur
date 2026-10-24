import { IExerciseType, IMuscle, ISettings, availableMuscles } from "../types";
import { Muscle_getAvailableMuscleGroups, Muscle_getMusclesFromScreenMuscle } from "./muscle";
import { Exercise_synergistMuscleMultipliers, Exercise_targetMuscles } from "./exercise";

export type IMusclePoints = Partial<Record<IMuscle, number>>;

export function UngroupedMuscles_list(settings: ISettings): IMuscle[] {
  const grouped = new Set(
    Muscle_getAvailableMuscleGroups(settings).flatMap((muscleGroup) =>
      Muscle_getMusclesFromScreenMuscle(muscleGroup, settings)
    )
  );
  return availableMuscles.filter((muscle) => !grouped.has(muscle));
}

export function UngroupedMuscles_pointsPerSet(exerciseType: IExerciseType, settings: ISettings): IMusclePoints {
  const ungrouped = new Set(UngroupedMuscles_list(settings));
  const points: IMusclePoints = {};
  for (const muscle of Exercise_targetMuscles(exerciseType, settings)) {
    if (ungrouped.has(muscle)) {
      points[muscle] = 1;
    }
  }
  for (const { muscle, multiplier } of Exercise_synergistMuscleMultipliers(exerciseType, settings)) {
    if (ungrouped.has(muscle) && points[muscle] == null) {
      points[muscle] = multiplier;
    }
  }
  return points;
}

export function UngroupedMuscles_divide(points: IMusclePoints, divisor: number): IMusclePoints {
  const result: IMusclePoints = {};
  for (const muscle of Object.keys(points) as IMuscle[]) {
    result[muscle] = divisor > 0 ? (points[muscle] ?? 0) / divisor : 0;
  }
  return result;
}

export function UngroupedMuscles_add(points: IMusclePoints, perSet: IMusclePoints, times: number): IMusclePoints {
  const result = { ...points };
  for (const muscle of Object.keys(perSet) as IMuscle[]) {
    result[muscle] = (result[muscle] ?? 0) + (perSet[muscle] ?? 0) * times;
  }
  return result;
}
