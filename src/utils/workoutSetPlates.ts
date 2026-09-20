import { IExerciseType, ISet, ISettings } from "../types";
import { Equipment_getEquipmentNameForExerciseType } from "../models/equipment";
import { Exercise_get } from "../models/exercise";
import { Weight_calculatePlates, Weight_eq, Weight_formatOneSide } from "../models/weight";

export interface IWorkoutSetPlatesLine {
  plates: string;
  isMatch: boolean;
}

export function WorkoutSetPlates_line(
  set: ISet,
  settings: ISettings,
  exerciseType: IExerciseType
): IWorkoutSetPlatesLine | undefined {
  const target = set.completedWeight ?? set.weight;
  if (target == null) {
    return undefined;
  }
  const exercise = Exercise_get(exerciseType, settings.exercises);
  if (Equipment_getEquipmentNameForExerciseType(settings, exercise) == null) {
    return undefined;
  }
  const { plates, totalWeight } = Weight_calculatePlates(target, settings, target.unit, exerciseType);
  if (plates.length === 0) {
    return undefined;
  }
  return {
    plates: Weight_formatOneSide(settings, plates, exerciseType),
    isMatch: Weight_eq(totalWeight, target),
  };
}
