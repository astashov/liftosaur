import { lb } from "lens-shmens";
import {
  equipmentName,
  IExercise,
  Exercise_targetMuscles,
  Exercise_synergistMuscles,
  Exercise_get,
  Exercise_similarRating,
  Exercise_targetMusclesGroups,
  Exercise_eq,
  Exercise_toKey,
  Exercise_fromKey,
  Exercise_fullName,
} from "../../models/exercise";
import {
  Muscle_getAvailableMuscleGroups,
  Muscle_getMusclesFromScreenMuscle,
  Muscle_getScreenMusclesFromMuscle,
  Muscle_getMuscleGroupName,
} from "../../models/muscle";
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
import { ObjectUtils_filter } from "../../utils/object";
import { SetUtils_containsAnyValues } from "../../utils/setUtils";
import { StringUtils_capitalize } from "../../utils/string";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IEvaluatedProgram } from "../../models/program";
import { PP_iterate2 } from "../../models/pp";
import { CollectionUtils_sort } from "../../utils/collection";
import {
  EditProgramUiHelpers_changeAllInstances,
  EditProgramUiHelpers_changeCurrentInstance3,
} from "../editProgram/editProgramUi/editProgramUiHelpers";
import { Equipment_getCurrentGym } from "../../models/equipment";

export function ExercisePickerUtils_getSelectedMuscleGroupNames(
  selectedValues: IMuscle[],
  settings: ISettings
): string[] {
  const currentGroups = Muscle_getAvailableMuscleGroups(settings).filter((muscleGroup) => {
    const muscles = Muscle_getMusclesFromScreenMuscle(muscleGroup, settings);
    return muscles.every((muscle) => selectedValues.includes(muscle));
  });
  const currentMuscles = selectedValues.filter((muscle) => {
    const group = Muscle_getScreenMusclesFromMuscle(muscle, settings)?.[0];
    return group && !currentGroups.includes(group);
  });
  return [...currentGroups.map((g) => Muscle_getMuscleGroupName(g, settings)), ...currentMuscles];
}

export function ExercisePickerUtils_getAllFilterNames(filters: IExercisePickerFilters, settings: ISettings): string[] {
  return [
    ...(filters.equipment || []).map((f) => equipmentName(f)),
    ...(filters.type || []).map((m) => StringUtils_capitalize(m)),
    ...ExercisePickerUtils_getSelectedMuscleGroupNames(filters.muscles || [], settings),
  ];
}

export function ExercisePickerUtils_getAllFilters(filters: IExercisePickerFilters): string[] {
  return [...(filters.equipment || []), ...(filters.type || []), ...(filters.muscles || [])];
}

export function ExercisePickerUtils_getCustomFilters(filters: IExercisePickerFilters): string[] {
  return [...(filters.type || []), ...(filters.muscles || [])];
}

export function ExercisePickerUtils_filterExercises(
  exercises: IExercise[],
  filters: IExercisePickerFilters,
  settings: ISettings
): IExercise[] {
  const allFilters = ExercisePickerUtils_getAllFilters(filters);
  if (allFilters.length === 0 && settings.workoutSettings.shouldShowInvisibleEquipment) {
    return exercises;
  }
  const gymEquipment = Equipment_getCurrentGym(settings).equipment;
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
      result = result && SetUtils_containsAnyValues(new Set(exercise.types), typeSet);
    }
    if (equipmentSet.size > 0) {
      result = result && SetUtils_containsAnyValues(new Set([exercise.equipment]), equipmentSet);
    }
    if (musclesSet.size > 0) {
      const muscles = new Set(
        Exercise_targetMuscles(exercise, settings).concat(Exercise_synergistMuscles(exercise, settings))
      );
      result = result && SetUtils_containsAnyValues(muscles, musclesSet);
    }
    return result;
  });
}

export function ExercisePickerUtils_getSelectedMuscleGroups(
  selectedValues: IMuscle[],
  settings: ISettings
): IScreenMuscle[] {
  return Muscle_getAvailableMuscleGroups(settings).filter((muscleGroup) => {
    const muscles = Muscle_getMusclesFromScreenMuscle(muscleGroup, settings);
    return muscles.every((muscle) => selectedValues.includes(muscle));
  });
}

export function ExercisePickerUtils_sortExercises(
  exercises: IExercise[],
  settings: ISettings,
  state: IExercisePickerState
): IExercise[] {
  return CollectionUtils_sort(exercises, (a, b) => {
    return ExercisePickerUtils_getSortRating(a, b, settings, state);
  });
}

export function ExercisePickerUtils_sortCustomExercises(
  customExercises: ICustomExercise[],
  settings: ISettings,
  state: IExercisePickerState
): ICustomExercise[] {
  return CollectionUtils_sort(customExercises, (aE, bE) => {
    const a = Exercise_get(aE, settings.exercises);
    const b = Exercise_get(bE, settings.exercises);
    return ExercisePickerUtils_getSortRating(a, b, settings, state);
  });
}

export function ExercisePickerUtils_getSortRating(
  a: IExercise,
  b: IExercise,
  settings: ISettings,
  state: IExercisePickerState
): number {
  const filters = state.filters;
  const sort = state.sort;
  const currentExerciseType = state.exerciseType;
  const exerciseType = currentExerciseType;
  if (sort === "similar_muscles" && exerciseType) {
    const aRating = Exercise_similarRating(exerciseType, a, settings);
    const bRating = Exercise_similarRating(exerciseType, b, settings);
    return bRating - aRating;
  } else if ((filters.muscles || []).length > 0) {
    const filterMuscleGroups = ExercisePickerUtils_getSelectedMuscleGroups(filters.muscles || [], settings);
    const aTargetMuscleGroups = Exercise_targetMusclesGroups(a, settings);
    const bTargetMuscleGroups = Exercise_targetMusclesGroups(b, settings);
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

export function ExercisePickerUtils_filterCustomExercises(
  customExercises: IAllCustomExercises,
  filters: IExercisePickerFilters
): IAllCustomExercises {
  const allFilters = ExercisePickerUtils_getCustomFilters(filters);
  if (allFilters.length === 0) {
    return customExercises;
  }
  return ObjectUtils_filter(customExercises, (_id, exercise) => {
    if (!exercise) {
      return false;
    }
    const typesSet = new Set(filters.type || []);
    const musclesSet = new Set(filters.muscles || []);
    let result = true;
    if (typesSet.size > 0) {
      result = result && SetUtils_containsAnyValues(new Set(exercise.types), typesSet);
    }
    if (musclesSet.size > 0) {
      const muscles = new Set(exercise.meta.targetMuscles.concat(exercise.meta.synergistMuscles));
      result = result && SetUtils_containsAnyValues(muscles, musclesSet);
    }
    return result;
  });
}

export function ExercisePickerUtils_chooseProgramExercise(
  dispatch: ILensDispatch<IExercisePickerState>,
  exerciseType: IExerciseType,
  week: number,
  dayInWeek: number,
  state: IExercisePickerState
): void {
  const isMultiselect = ExercisePickerUtils_getIsMultiselect(state);
  const isInExercises = state.selectedExercises.some((e) => {
    return (
      "exerciseType" in e &&
      Exercise_eq(e.exerciseType, exerciseType) &&
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
              Exercise_eq(e.exerciseType, exerciseType) &&
              e.type === "program" &&
              e.week === week &&
              e.dayInWeek === dayInWeek
          )
        ) {
          return exercises.filter((e) => e.type !== "program" || !Exercise_eq(e.exerciseType, exerciseType));
        } else {
          if (isMultiselect) {
            return [...exercises, { type: "program", exerciseType, week, dayInWeek }];
          } else {
            return [{ type: "program", exerciseType, week, dayInWeek }];
          }
        }
      }),
    `Toggle selection of program exercise ${Exercise_toKey(exerciseType)}[${week}:${dayInWeek}]`
  );
}

export function ExercisePickerUtils_getIsMultiselect(state: IExercisePickerState): boolean {
  return state.mode === "workout" && !state.exerciseType;
}

export function ExercisePickerUtils_chooseAdhocExercise(
  dispatch: ILensDispatch<IExercisePickerState>,
  key: string,
  state: IExercisePickerState
): void {
  const selectedExercises = state.selectedExercises;
  const isMultiselect = ExercisePickerUtils_getIsMultiselect(state);
  const exerciseType = Exercise_fromKey(key);
  const isInProgramExercises = selectedExercises.some(
    (e) => e.type === "program" && Exercise_eq(e.exerciseType, exerciseType)
  );
  if (isMultiselect && isInProgramExercises) {
    return;
  }
  dispatch(
    lb<IExercisePickerState>()
      .p("selectedExercises")
      .recordModify((exercises) => {
        if (isMultiselect && exercises.some((e) => e.type === "adhoc" && Exercise_eq(e.exerciseType, exerciseType))) {
          return exercises.filter((e) => e.type !== "adhoc" || !Exercise_eq(e.exerciseType, exerciseType));
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

export function ExercisePickerUtils_getProgramExercisefullName(
  exercise: IExercisePickerProgramExercise,
  program: IEvaluatedProgram,
  settings: ISettings
): string {
  const exerciseType = Exercise_get(exercise.exerciseType, settings.exercises);
  if (!exerciseType) {
    return "";
  }
  const name = Exercise_fullName(exerciseType, settings);
  let count = 0;
  PP_iterate2(program.weeks, (e) => {
    if (e.exerciseType && Exercise_eq(e.exerciseType, exercise.exerciseType)) {
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

export function ExercisePickerUtils_changeLabel(
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
        EditProgramUiHelpers_changeAllInstances(planner, fullName, settings, true, (e) => {
          e.label = value;
        })
      ),
      "Change label for all instances"
    );
  } else {
    plannerDispatch(
      lb<IPlannerProgram>().record(
        EditProgramUiHelpers_changeCurrentInstance3(planner, fullName, dayData, false, settings, true, (e) => {
          e.label = value;
        })
      ),
      "Change label for one instance"
    );
  }
}
