import { equipmentName, Exercise, IExercise } from "../../models/exercise";
import { Muscle } from "../../models/muscle";
import { IAllCustomExercises, IExercisePickerFilters, IMuscle, screenMuscles } from "../../types";
import { ObjectUtils } from "../../utils/object";
import { SetUtils } from "../../utils/setUtils";
import { StringUtils } from "../../utils/string";

export class ExercisePickerUtils {
  public static getSelectedMuscleGroups(selectedValues: IMuscle[]): string[] {
    const currentGroups = screenMuscles.filter((muscleGroup) => {
      const muscles = Muscle.getMusclesFromScreenMuscle(muscleGroup);
      return muscles.every((muscle) => selectedValues.includes(muscle));
    });
    const currentMuscles = selectedValues.filter((muscle) => {
      const group = Muscle.getScreenMusclesFromMuscle(muscle)?.[0];
      return group && !currentGroups.includes(group);
    });
    return [...currentGroups.map((g) => StringUtils.capitalize(g)), ...currentMuscles];
  }

  public static getAllFilterNames(filters: IExercisePickerFilters): string[] {
    return [
      ...(filters.equipment || []).map((f) => equipmentName(f)),
      ...(filters.type || []).map((m) => StringUtils.capitalize(m)),
      ...ExercisePickerUtils.getSelectedMuscleGroups(filters.muscles || []),
    ];
  }

  public static getAllFilters(filters: IExercisePickerFilters): string[] {
    return [...(filters.equipment || []), ...(filters.type || []), ...(filters.muscles || [])];
  }

  public static getCustomFilters(filters: IExercisePickerFilters): string[] {
    return [...(filters.type || []), ...(filters.muscles || [])];
  }

  public static filterExercises(exercises: IExercise[], filters: IExercisePickerFilters): IExercise[] {
    const allFilters = ExercisePickerUtils.getAllFilters(filters);
    if (allFilters.length === 0) {
      return exercises;
    }
    return exercises.filter((exercise) => {
      if (!exercise) {
        return false;
      }
      if (SetUtils.containsAnyValues(new Set(exercise.types), new Set(filters.type || []))) {
        return true;
      }
      if (SetUtils.containsAnyValues(new Set([exercise.equipment]), new Set(filters.equipment || []))) {
        return true;
      }
      const muscles = new Set(Exercise.targetMuscles(exercise, {}).concat(Exercise.synergistMuscles(exercise, {})));
      if (SetUtils.containsAnyValues(muscles, new Set(filters.muscles || []))) {
        return true;
      }
      return false;
    });
  }

  public static filterCustomExercises(
    customExercises: IAllCustomExercises,
    filters: IExercisePickerFilters
  ): IAllCustomExercises {
    const allFilters = ExercisePickerUtils.getCustomFilters(filters);
    if (allFilters.length === 0) {
      return customExercises;
    }
    return ObjectUtils.filter(customExercises, (_id, exercise) => {
      if (!exercise) {
        return false;
      }
      if (SetUtils.containsAnyValues(new Set(exercise.types), new Set(filters.type || []))) {
        return true;
      }
      const muscles = new Set(exercise.meta.targetMuscles.concat(exercise.meta.synergistMuscles));
      if (SetUtils.containsAnyValues(muscles, new Set(filters.muscles || []))) {
        return true;
      }
      return false;
    });
  }
}
