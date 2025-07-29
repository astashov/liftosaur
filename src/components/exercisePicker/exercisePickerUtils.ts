import { lb } from "lens-shmens";
import { equipmentName, Exercise, IExercise } from "../../models/exercise";
import { Muscle } from "../../models/muscle";
import {
  IAllCustomExercises,
  IExercisePickerFilters,
  IExercisePickerProgramExercise,
  IExercisePickerSelectedExercise,
  IExercisePickerState,
  IExerciseType,
  IMuscle,
  ISettings,
  screenMuscles,
} from "../../types";
import { ObjectUtils } from "../../utils/object";
import { SetUtils } from "../../utils/setUtils";
import { StringUtils } from "../../utils/string";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IEvaluatedProgram } from "../../models/program";
import { PP } from "../../models/pp";

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

  public static chooseProgramExercise(
    dispatch: ILensDispatch<IExercisePickerState>,
    exerciseType: IExerciseType,
    week: number,
    dayInWeek: number,
    selectedExercises: IExercisePickerSelectedExercise[]
  ): void {
    const isInExercises = selectedExercises.some((e) => {
      return (
        Exercise.eq(e.exerciseType, exerciseType) &&
        (e.type === "adhoc" || e.week !== week || e.dayInWeek !== dayInWeek)
      );
    });
    if (isInExercises) {
      return;
    }
    dispatch(
      lb<IExercisePickerState>()
        .p("selectedExercises")
        .recordModify((exercises) => {
          if (exercises.some((e) => Exercise.eq(e.exerciseType, exerciseType))) {
            return exercises.filter((e) => !Exercise.eq(e.exerciseType, exerciseType));
          } else {
            return [...exercises, { type: "program", exerciseType, week, dayInWeek }];
          }
        }),
      `Toggle selection of program exercise ${Exercise.toKey(exerciseType)}[${week}:${dayInWeek}]`
    );
  }

  public static chooseAdhocExercise(
    dispatch: ILensDispatch<IExercisePickerState>,
    key: string,
    selectedExercises: IExercisePickerSelectedExercise[]
  ): void {
    const exerciseType = Exercise.fromKey(key);
    const isInProgramExercises = selectedExercises.some(
      (e) => e.type === "program" && Exercise.eq(e.exerciseType, exerciseType)
    );
    if (isInProgramExercises) {
      return;
    }
    dispatch(
      lb<IExercisePickerState>()
        .p("selectedExercises")
        .recordModify((exercises) => {
          if (exercises.some((e) => Exercise.eq(e.exerciseType, exerciseType))) {
            return exercises.filter((e) => !Exercise.eq(e.exerciseType, exerciseType));
          } else {
            return [...exercises, { type: "adhoc", exerciseType }];
          }
        }),
      `Toggle selection of ${key}`
    );
  }

  public static getProgramExercisefullName(
    exercise: IExercisePickerProgramExercise,
    program: IEvaluatedProgram,
    settings: ISettings
  ): string {
    const exerciseType = Exercise.get(exercise.exerciseType, settings.exercises);
    if (!exerciseType) {
      return "";
    }
    const name = Exercise.fullName(exerciseType, settings);
    let count = 0;
    PP.iterate2(program.weeks, (e) => {
      if (e.exerciseType && Exercise.eq(e.exerciseType, exercise.exerciseType)) {
        count += 1;
      }
      if (count > 1) {
        return true;
      }
      return false;
    });
    const isMultipleInstances = count > 1;
    let suffix = [];
    if (isMultipleInstances) {
      if (program.weeks.length > 1) {
        suffix.push(exercise.week);
      }
      suffix.push(exercise.dayInWeek);
    }
    return `${name}${isMultipleInstances ? `[${suffix.join(":")}]` : ""}`;
  }
}
