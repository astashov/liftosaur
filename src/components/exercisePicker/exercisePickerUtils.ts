import { lb } from "lens-shmens";
import { equipmentName, Exercise, IExercise } from "../../models/exercise";
import { Muscle } from "../../models/muscle";
import {
  IAllCustomExercises,
  ICustomExercise,
  IExercisePickerFilters,
  IExercisePickerProgramExercise,
  IExercisePickerState,
  IExerciseType,
  IMuscle,
  IPlannerProgram,
  IScreenMuscle,
  ISettings,
  IShortDayData,
} from "../../types";
import { ObjectUtils } from "../../utils/object";
import { SetUtils } from "../../utils/setUtils";
import { StringUtils } from "../../utils/string";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IEvaluatedProgram } from "../../models/program";
import { PP } from "../../models/pp";
import { CollectionUtils } from "../../utils/collection";
import { EditProgramUiHelpers } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { Equipment } from "../../models/equipment";

export class ExercisePickerUtils {
  public static getSelectedMuscleGroupNames(selectedValues: IMuscle[], settings: ISettings): string[] {
    const currentGroups = Muscle.getAvailableMuscleGroups(settings).filter((muscleGroup) => {
      const muscles = Muscle.getMusclesFromScreenMuscle(muscleGroup, settings);
      return muscles.every((muscle) => selectedValues.includes(muscle));
    });
    const currentMuscles = selectedValues.filter((muscle) => {
      const group = Muscle.getScreenMusclesFromMuscle(muscle, settings)?.[0];
      return group && !currentGroups.includes(group);
    });
    return [...currentGroups.map((g) => StringUtils.capitalize(g)), ...currentMuscles];
  }

  public static getAllFilterNames(filters: IExercisePickerFilters, settings: ISettings): string[] {
    return [
      ...(filters.equipment || []).map((f) => equipmentName(f)),
      ...(filters.type || []).map((m) => StringUtils.capitalize(m)),
      ...ExercisePickerUtils.getSelectedMuscleGroupNames(filters.muscles || [], settings),
    ];
  }

  public static getAllFilters(filters: IExercisePickerFilters): string[] {
    return [...(filters.equipment || []), ...(filters.type || []), ...(filters.muscles || [])];
  }

  public static getCustomFilters(filters: IExercisePickerFilters): string[] {
    return [...(filters.type || []), ...(filters.muscles || [])];
  }

  public static filterExercises(
    exercises: IExercise[],
    filters: IExercisePickerFilters,
    settings: ISettings
  ): IExercise[] {
    const allFilters = ExercisePickerUtils.getAllFilters(filters);
    if (allFilters.length === 0 && settings.workoutSettings.shouldShowInvisibleEquipment) {
      return exercises;
    }
    const gymEquipment = Equipment.getCurrentGym(settings).equipment;
    return exercises.filter((exercise) => {
      if (!exercise) {
        return false;
      }
      if (
        !settings.workoutSettings.shouldShowInvisibleEquipment &&
        exercise.equipment &&
        gymEquipment[exercise.equipment]?.isDeleted
      ) {
        return false;
      }
      const typeSet = new Set(filters.type || []);
      const equipmentSet = new Set(filters.equipment || []);
      const musclesSet = new Set(filters.muscles || []);
      let result = true;
      if (typeSet.size > 0) {
        result = result && SetUtils.containsAnyValues(new Set(exercise.types), typeSet);
      }
      if (equipmentSet.size > 0) {
        result = result && SetUtils.containsAnyValues(new Set([exercise.equipment]), equipmentSet);
      }
      if (musclesSet.size > 0) {
        const muscles = new Set(
          Exercise.targetMuscles(exercise, settings).concat(Exercise.synergistMuscles(exercise, settings))
        );
        result = result && SetUtils.containsAnyValues(muscles, musclesSet);
      }
      return result;
    });
  }

  public static getSelectedMuscleGroups(selectedValues: IMuscle[], settings: ISettings): IScreenMuscle[] {
    return Muscle.getAvailableMuscleGroups(settings).filter((muscleGroup) => {
      const muscles = Muscle.getMusclesFromScreenMuscle(muscleGroup, settings);
      return muscles.every((muscle) => selectedValues.includes(muscle));
    });
  }

  public static sortExercises(exercises: IExercise[], settings: ISettings, state: IExercisePickerState): IExercise[] {
    return CollectionUtils.sort(exercises, (a, b) => {
      return ExercisePickerUtils.getSortRating(a, b, settings, state);
    });
  }

  public static sortCustomExercises(
    customExercises: ICustomExercise[],
    settings: ISettings,
    state: IExercisePickerState
  ): ICustomExercise[] {
    return CollectionUtils.sort(customExercises, (aE, bE) => {
      const a = Exercise.get(aE, settings.exercises);
      const b = Exercise.get(bE, settings.exercises);
      return ExercisePickerUtils.getSortRating(a, b, settings, state);
    });
  }

  private static getSortRating(a: IExercise, b: IExercise, settings: ISettings, state: IExercisePickerState): number {
    const filters = state.filters;
    const sort = state.sort;
    const currentExerciseType = state.exerciseType;
    const exerciseType = currentExerciseType;
    if (sort === "similar_muscles" && exerciseType) {
      const aRating = Exercise.similarRating(exerciseType, a, settings);
      const bRating = Exercise.similarRating(exerciseType, b, settings);
      return bRating - aRating;
    } else if ((filters.muscles || []).length > 0) {
      const filterMuscleGroups = ExercisePickerUtils.getSelectedMuscleGroups(filters.muscles || [], settings);
      const aTargetMuscleGroups = Exercise.targetMusclesGroups(a, settings);
      const bTargetMuscleGroups = Exercise.targetMusclesGroups(b, settings);
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
      const typesSet = new Set(filters.type || []);
      const musclesSet = new Set(filters.muscles || []);
      let result = true;
      if (typesSet.size > 0) {
        result = result && SetUtils.containsAnyValues(new Set(exercise.types), typesSet);
      }
      if (musclesSet.size > 0) {
        const muscles = new Set(exercise.meta.targetMuscles.concat(exercise.meta.synergistMuscles));
        result = result && SetUtils.containsAnyValues(muscles, musclesSet);
      }
      return result;
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
        "exerciseType" in e &&
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
                "exerciseType" in e &&
                Exercise.eq(e.exerciseType, exerciseType) &&
                e.type === "program" &&
                e.week === week &&
                e.dayInWeek === dayInWeek
            )
          ) {
            return exercises.filter((e) => e.type !== "program" || !Exercise.eq(e.exerciseType, exerciseType));
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
          if (isMultiselect && exercises.some((e) => e.type === "adhoc" && Exercise.eq(e.exerciseType, exerciseType))) {
            return exercises.filter((e) => e.type !== "adhoc" || !Exercise.eq(e.exerciseType, exerciseType));
          } else {
            if (isMultiselect) {
              return [...exercises, { type: "adhoc", exerciseType, label: state.label }];
            } else {
              return [{ type: "adhoc", exerciseType, label: state.label }];
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
    const suffix = [];
    if (isMultipleInstances) {
      if (program.weeks.length > 1) {
        suffix.push(exercise.week);
      }
      suffix.push(exercise.dayInWeek);
    }
    return `${name}${isMultipleInstances ? `[${suffix.join(":")}]` : ""}`;
  }

  public static changeLabel(
    planner: IPlannerProgram,
    plannerDispatch: ILensDispatch<IPlannerProgram>,
    fullName: string,
    dayData: IShortDayData,
    value: string | undefined,
    settings: ISettings,
    shouldChangeAll: boolean
  ): void {
    if (shouldChangeAll) {
      plannerDispatch(
        lb<IPlannerProgram>().record(
          EditProgramUiHelpers.changeAllInstances(planner, fullName, settings, true, (e) => {
            e.label = value;
          })
        ),
        "Change label for all instances"
      );
    } else {
      plannerDispatch(
        lb<IPlannerProgram>().record(
          EditProgramUiHelpers.changeCurrentInstance3(planner, fullName, dayData, false, settings, true, (e) => {
            e.label = value;
          })
        ),
        "Change label for one instance"
      );
    }
  }
}
