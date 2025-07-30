import { lb } from "lens-shmens";
import { equipmentName, Exercise, IExercise } from "../../models/exercise";
import { Muscle } from "../../models/muscle";
import {
  IAllCustomExercises,
  IExercisePickerFilters,
  IExercisePickerProgramExercise,
  IExercisePickerSort,
  IExercisePickerState,
  IExerciseType,
  IMuscle,
  IScreenMuscle,
  ISettings,
  screenMuscles,
} from "../../types";
import { ObjectUtils } from "../../utils/object";
import { SetUtils } from "../../utils/setUtils";
import { StringUtils } from "../../utils/string";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IEvaluatedProgram } from "../../models/program";
import { PP } from "../../models/pp";
import { CollectionUtils } from "../../utils/collection";

export class ExercisePickerUtils {
  public static getSelectedMuscleGroupNames(selectedValues: IMuscle[]): string[] {
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
      ...ExercisePickerUtils.getSelectedMuscleGroupNames(filters.muscles || []),
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

  public static getSelectedMuscleGroups(selectedValues: IMuscle[]): IScreenMuscle[] {
    return screenMuscles.filter((muscleGroup) => {
      const muscles = Muscle.getMusclesFromScreenMuscle(muscleGroup);
      return muscles.every((muscle) => selectedValues.includes(muscle));
    });
  }

  public static sortExercises(
    exercises: IExercise[],
    sort: IExercisePickerSort,
    filters: IExercisePickerFilters,
    allCustomExercises: IAllCustomExercises,
    currentExerciseType?: IExerciseType
  ): IExercise[] {
    return CollectionUtils.sort(exercises, (a, b) => {
      const exerciseType = currentExerciseType;
      if (sort === "similar_muscles" && exerciseType) {
        const aRating = Exercise.similarRating(exerciseType, a, allCustomExercises);
        const bRating = Exercise.similarRating(exerciseType, b, allCustomExercises);
        return bRating - aRating;
      } else if ((filters.muscles || []).length > 0) {
        const filterMuscleGroups = ExercisePickerUtils.getSelectedMuscleGroups(filters.muscles || []);
        const aTargetMuscleGroups = Exercise.targetMusclesGroups(a, allCustomExercises);
        const bTargetMuscleGroups = Exercise.targetMusclesGroups(b, allCustomExercises);
        if (
          aTargetMuscleGroups.some((m) => filterMuscleGroups.indexOf(m) !== -1) &&
          bTargetMuscleGroups.every((m) => filterMuscleGroups.indexOf(m) === -1)
        ) {
          return -1;
        } else if (
          bTargetMuscleGroups.some((m) => filterMuscleGroups.indexOf(m) !== -1) &&
          aTargetMuscleGroups.every((m) => filterMuscleGroups.indexOf(m) === -1)
        ) {
          return 1;
        } else {
          return a.name.localeCompare(b.name);
        }
      } else {
        return a.name.localeCompare(b.name);
      }
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
    state: IExercisePickerState
  ): void {
    const isMultiselect = ExercisePickerUtils.getIsMultiselect(state);
    const isInExercises = state.selectedExercises.some((e) => {
      return (
        Exercise.eq(e.exerciseType, exerciseType) &&
        (e.type === "adhoc" || e.week !== week || e.dayInWeek !== dayInWeek)
      );
    });
    if (isMultiselect && isInExercises) {
      return;
    }
    dispatch(
      lb<IExercisePickerState>()
        .p("selectedExercises")
        .recordModify((exercises) => {
          if (
            exercises.some(
              (e) =>
                Exercise.eq(e.exerciseType, exerciseType) &&
                e.type === "program" &&
                e.week === week &&
                e.dayInWeek === dayInWeek
            )
          ) {
            return exercises.filter((e) => !Exercise.eq(e.exerciseType, exerciseType));
          } else {
            if (isMultiselect) {
              return [...exercises, { type: "program", exerciseType, week, dayInWeek }];
            } else {
              return [{ type: "program", exerciseType, week, dayInWeek }];
            }
          }
        }),
      `Toggle selection of program exercise ${Exercise.toKey(exerciseType)}[${week}:${dayInWeek}]`
    );
  }

  public static getIsMultiselect(state: IExercisePickerState): boolean {
    return state.mode === "workout" && !state.exerciseType;
  }

  public static chooseAdhocExercise(
    dispatch: ILensDispatch<IExercisePickerState>,
    key: string,
    state: IExercisePickerState
  ): void {
    const selectedExercises = state.selectedExercises;
    const isMultiselect = ExercisePickerUtils.getIsMultiselect(state);
    const exerciseType = Exercise.fromKey(key);
    const isInProgramExercises = selectedExercises.some(
      (e) => e.type === "program" && Exercise.eq(e.exerciseType, exerciseType)
    );
    if (isMultiselect && isInProgramExercises) {
      return;
    }
    dispatch(
      lb<IExercisePickerState>()
        .p("selectedExercises")
        .recordModify((exercises) => {
          if (exercises.some((e) => Exercise.eq(e.exerciseType, exerciseType) && e.type === "adhoc")) {
            return exercises.filter((e) => !Exercise.eq(e.exerciseType, exerciseType));
          } else {
            if (isMultiselect) {
              return [...exercises, { type: "adhoc", exerciseType }];
            } else {
              return [{ type: "adhoc", exerciseType }];
            }
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
