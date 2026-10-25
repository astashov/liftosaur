import { IScreenMuscle, ISettings } from "../types";
import { IMuscleGroupSetSplit, ISetSplit } from "../pages/planner/models/types";
import { Muscle_getAvailableMuscleGroups, Muscle_isBuiltInMuscleGroup } from "./muscle";

export interface IMuscleGroupOrderRow {
  muscleGroup: IScreenMuscle;
  split: ISetSplit;
}

const regions: IScreenMuscle[][] = [
  ["chest", "frontDelts", "sideDelts", "triceps"],
  ["lats", "upperBack", "rearDelts", "biceps"],
  ["quadriceps", "hamstrings", "glutes", "calves"],
  ["abs", "obliques", "lowerBack"],
  ["upperTraps", "rotatorCuff", "forearmFlexors", "forearmExtensors", "hipFlexors", "abductors", "adductors", "neck"],
];

function emptySplit(): ISetSplit {
  return { strength: 0, hypertrophy: 0, exercises: [], frequency: {} };
}

export function MuscleGroupOrder_sections(
  splits: Partial<IMuscleGroupSetSplit>,
  settings: ISettings
): IMuscleGroupOrderRow[][] {
  const available = Muscle_getAvailableMuscleGroups(settings);
  const custom = available.filter((muscleGroup) => !Muscle_isBuiltInMuscleGroup(muscleGroup));
  return [...regions, custom]
    .map((region) =>
      region
        .filter((muscleGroup) => available.includes(muscleGroup))
        .map((muscleGroup) => ({ muscleGroup, split: splits[muscleGroup] ?? emptySplit() }))
    )
    .filter((rows) => rows.length > 0);
}
