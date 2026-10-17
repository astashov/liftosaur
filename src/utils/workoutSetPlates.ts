import { IExerciseType, ISet, ISettings, IWeight } from "../types";
import { Equipment_getEquipmentNameForExerciseType } from "../models/equipment";
import { Exercise_get } from "../models/exercise";
import { Weight_realizeLoad, Weight_setupForExercise } from "../models/weight";
import { EquipmentLoadText_picture, IEquipmentLoadPicture } from "../models/equipmentLoadText";

export function WorkoutSetPlates_picture(
  weight: IWeight,
  settings: ISettings,
  exerciseType: IExerciseType,
  isWarmup: boolean
): IEquipmentLoadPicture | undefined {
  return EquipmentLoadText_picture(
    Weight_realizeLoad(weight, settings, exerciseType, isWarmup),
    Weight_setupForExercise(weight, settings, exerciseType)
  );
}

export function WorkoutSetPlates_line(
  set: ISet,
  settings: ISettings,
  exerciseType: IExerciseType,
  isWarmup: boolean
): IEquipmentLoadPicture | undefined {
  const target = set.completedWeight ?? set.weight;
  if (target == null) {
    return undefined;
  }
  const exercise = Exercise_get(exerciseType, settings.exercises);
  if (Equipment_getEquipmentNameForExerciseType(settings, exercise) == null) {
    return undefined;
  }
  return WorkoutSetPlates_picture(target, settings, exerciseType, isWarmup);
}
