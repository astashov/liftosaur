import {
  ISettings,
  IPlannerSettings,
  IAllEquipment,
  IAllCustomExercises,
  ITargetType,
  targetTypes,
  IProgram,
  IExerciseType,
  IWeight,
} from "../types";
import { Weight_build, Weight_print } from "./weight";
import { IExportedProgram, Program_evaluate, Program_getAllUsedProgramExercises } from "./program";
import { ObjectUtils_filter } from "../utils/object";
import { lb } from "lens-shmens";
import { updateSettings } from "./state";
import { IDispatch } from "../ducks/types";
import { IExercise, Exercise_toKey, Exercise_get, Exercise_nameWithEquipment } from "./exercise";
import { CollectionUtils_uniqByExpr, CollectionUtils_sort } from "../utils/collection";
import { ProgramExercise_doesUse1RM } from "./programExercise";
import { IExercisePickerSettings } from "../components/exercisePicker/exercisePickerSettings";
import { SendMessage_toIosAndAndroid } from "../utils/sendMessage";

export function Settings_programContentBuild(): Pick<ISettings, "timers" | "units" | "planner"> {
  return {
    timers: {
      warmup: 90,
      workout: 180,
      reminder: 900,
    },
    units: "lb",
    planner: Settings_buildPlannerSettings(),
  };
}

export function Settings_defaultEquipment(): IAllEquipment {
  return {
    barbell: {
      vtype: "equipment_data",
      multiplier: 2,
      bar: {
        lb: Weight_build(45, "lb"),
        kg: Weight_build(20, "kg"),
      },
      plates: [
        { weight: Weight_build(45, "lb"), num: 8 },
        { weight: Weight_build(25, "lb"), num: 4 },
        { weight: Weight_build(10, "lb"), num: 4 },
        { weight: Weight_build(5, "lb"), num: 4 },
        { weight: Weight_build(2.5, "lb"), num: 4 },
        { weight: Weight_build(1.25, "lb"), num: 2 },
        { weight: Weight_build(20, "kg"), num: 8 },
        { weight: Weight_build(10, "kg"), num: 4 },
        { weight: Weight_build(5, "kg"), num: 4 },
        { weight: Weight_build(2.5, "kg"), num: 4 },
        { weight: Weight_build(1.25, "kg"), num: 4 },
        { weight: Weight_build(0.5, "kg"), num: 2 },
      ],
      fixed: [],
      isFixed: false,
    },
    trapbar: {
      vtype: "equipment_data",
      multiplier: 2,
      bar: {
        lb: Weight_build(45, "lb"),
        kg: Weight_build(20, "kg"),
      },
      plates: [
        { weight: Weight_build(45, "lb"), num: 8 },
        { weight: Weight_build(25, "lb"), num: 4 },
        { weight: Weight_build(10, "lb"), num: 4 },
        { weight: Weight_build(5, "lb"), num: 4 },
        { weight: Weight_build(2.5, "lb"), num: 4 },
        { weight: Weight_build(1.25, "lb"), num: 2 },
        { weight: Weight_build(20, "kg"), num: 8 },
        { weight: Weight_build(10, "kg"), num: 4 },
        { weight: Weight_build(5, "kg"), num: 4 },
        { weight: Weight_build(2.5, "kg"), num: 4 },
        { weight: Weight_build(1.25, "kg"), num: 4 },
        { weight: Weight_build(0.5, "kg"), num: 2 },
      ],
      fixed: [],
      isFixed: false,
    },
    leverageMachine: {
      vtype: "equipment_data",
      multiplier: 1,
      bar: {
        lb: Weight_build(0, "lb"),
        kg: Weight_build(0, "kg"),
      },
      plates: [
        { weight: Weight_build(45, "lb"), num: 8 },
        { weight: Weight_build(25, "lb"), num: 4 },
        { weight: Weight_build(10, "lb"), num: 4 },
        { weight: Weight_build(5, "lb"), num: 4 },
        { weight: Weight_build(2.5, "lb"), num: 4 },
        { weight: Weight_build(1.25, "lb"), num: 2 },
        { weight: Weight_build(20, "kg"), num: 8 },
        { weight: Weight_build(10, "kg"), num: 4 },
        { weight: Weight_build(5, "kg"), num: 4 },
        { weight: Weight_build(2.5, "kg"), num: 4 },
        { weight: Weight_build(1.25, "kg"), num: 4 },
        { weight: Weight_build(0.5, "kg"), num: 2 },
      ],
      fixed: [],
      isFixed: false,
    },
    smith: {
      vtype: "equipment_data",
      multiplier: 2,
      bar: {
        lb: Weight_build(45, "lb"),
        kg: Weight_build(20, "kg"),
      },
      plates: [
        { weight: Weight_build(45, "lb"), num: 8 },
        { weight: Weight_build(25, "lb"), num: 4 },
        { weight: Weight_build(10, "lb"), num: 4 },
        { weight: Weight_build(5, "lb"), num: 4 },
        { weight: Weight_build(2.5, "lb"), num: 4 },
        { weight: Weight_build(1.25, "lb"), num: 2 },
        { weight: Weight_build(20, "kg"), num: 8 },
        { weight: Weight_build(10, "kg"), num: 4 },
        { weight: Weight_build(5, "kg"), num: 4 },
        { weight: Weight_build(2.5, "kg"), num: 4 },
        { weight: Weight_build(1.25, "kg"), num: 4 },
        { weight: Weight_build(0.5, "kg"), num: 2 },
      ],
      fixed: [],
      isFixed: false,
    },
    dumbbell: {
      vtype: "equipment_data",
      multiplier: 2,
      bar: {
        lb: Weight_build(10, "lb"),
        kg: Weight_build(5, "kg"),
      },
      plates: [
        { weight: Weight_build(10, "lb"), num: 8 },
        { weight: Weight_build(5, "lb"), num: 4 },
        { weight: Weight_build(2.5, "lb"), num: 4 },
        { weight: Weight_build(1.25, "lb"), num: 2 },
        { weight: Weight_build(5, "kg"), num: 8 },
        { weight: Weight_build(2.5, "kg"), num: 4 },
        { weight: Weight_build(1.25, "kg"), num: 4 },
        { weight: Weight_build(0.5, "kg"), num: 2 },
      ],
      fixed: [
        Weight_build(10, "lb"),
        Weight_build(15, "lb"),
        Weight_build(20, "lb"),
        Weight_build(25, "lb"),
        Weight_build(30, "lb"),
        Weight_build(35, "lb"),
        Weight_build(40, "lb"),
        Weight_build(4, "kg"),
        Weight_build(6, "kg"),
        Weight_build(8, "kg"),
        Weight_build(10, "kg"),
        Weight_build(12, "kg"),
        Weight_build(14, "kg"),
        Weight_build(20, "kg"),
      ],
      isFixed: false,
    },
    ezbar: {
      vtype: "equipment_data",
      multiplier: 2,
      bar: {
        lb: Weight_build(20, "lb"),
        kg: Weight_build(10, "kg"),
      },
      plates: [
        { weight: Weight_build(45, "lb"), num: 8 },
        { weight: Weight_build(25, "lb"), num: 4 },
        { weight: Weight_build(10, "lb"), num: 4 },
        { weight: Weight_build(5, "lb"), num: 4 },
        { weight: Weight_build(2.5, "lb"), num: 4 },
        { weight: Weight_build(1.25, "lb"), num: 2 },
        { weight: Weight_build(20, "kg"), num: 8 },
        { weight: Weight_build(10, "kg"), num: 4 },
        { weight: Weight_build(5, "kg"), num: 4 },
        { weight: Weight_build(2.5, "kg"), num: 4 },
        { weight: Weight_build(1.25, "kg"), num: 4 },
        { weight: Weight_build(0.5, "kg"), num: 2 },
      ],
      fixed: [],
      isFixed: false,
    },
    cable: {
      vtype: "equipment_data",
      multiplier: 1,
      bar: {
        lb: Weight_build(0, "lb"),
        kg: Weight_build(0, "kg"),
      },
      plates: [
        {
          weight: Weight_build(10, "lb"),
          num: 20,
        },
        {
          weight: Weight_build(5, "lb"),
          num: 10,
        },
        {
          weight: Weight_build(5, "kg"),
          num: 20,
        },
        {
          weight: Weight_build(2.5, "kg"),
          num: 10,
        },
      ],
      fixed: [],
      isFixed: false,
    },
    kettlebell: {
      vtype: "equipment_data",
      multiplier: 1,
      bar: {
        lb: Weight_build(0, "lb"),
        kg: Weight_build(0, "kg"),
      },
      plates: [],
      fixed: [
        Weight_build(10, "lb"),
        Weight_build(15, "lb"),
        Weight_build(20, "lb"),
        Weight_build(25, "lb"),
        Weight_build(30, "lb"),
        Weight_build(35, "lb"),
        Weight_build(40, "lb"),
        Weight_build(4, "kg"),
        Weight_build(8, "kg"),
        Weight_build(12, "kg"),
        Weight_build(16, "kg"),
        Weight_build(24, "kg"),
      ],
      isFixed: true,
    },
  };
}

export function Settings_build(): ISettings {
  return {
    ...Settings_programContentBuild(),
    graphsSettings: {
      isSameXAxis: false,
      isWithBodyweight: false,
      isWithOneRm: true,
    },
    exerciseData: {},
    graphOptions: {},
    exerciseStatsSettings: {
      ascendingSort: false,
    },
    gyms: [
      {
        vtype: "gym",
        id: "default",
        name: "Main",
        equipment: Settings_defaultEquipment(),
      },
    ],
    deletedGyms: [],
    volume: 1.0,
    vibration: false,
    startWeekFromMonday: false,
    lengthUnits: "in",
    workoutSettings: {
      targetType: "target",
    },
    statsEnabled: { weight: { weight: true }, length: {}, percentage: {} },
    exercises: {},
    graphs: { graphs: [], vtype: "graphs" },
    planner: Settings_buildPlannerSettings(),
    muscleGroups: {
      vtype: "muscle_groups_settings",
      data: {},
    },
  };
}

export function Settings_buildPlannerSettings(): IPlannerSettings {
  return {
    strengthSetsPct: 30,
    hypertrophySetsPct: 70,
    weeklyRangeSets: {
      shoulders: [10, 12],
      triceps: [10, 12],
      back: [10, 12],
      abs: [10, 12],
      glutes: [10, 12],
      hamstrings: [10, 12],
      quadriceps: [10, 12],
      chest: [10, 12],
      biceps: [10, 12],
      calves: [10, 12],
      forearms: [10, 12],
    },
    weeklyFrequency: {
      shoulders: 2,
      triceps: 2,
      back: 2,
      abs: 2,
      glutes: 2,
      hamstrings: 2,
      quadriceps: 2,
      chest: 2,
      biceps: 2,
      calves: 2,
      forearms: 2,
    },
    synergistMultiplier: 0.5,
  };
}

export function Settings_applyExportedProgram(settings: ISettings, exportedProgram: IExportedProgram): ISettings {
  const result = {
    ...settings,
    exercises: {
      ...settings.exercises,
      ...exportedProgram.customExercises,
    },
    units: settings.units || exportedProgram.settings.units,
    timers: {
      ...settings.timers,
      workout: settings.timers.workout || exportedProgram.settings.timers?.workout,
      warmup: settings.timers.warmup || exportedProgram.settings.timers?.warmup,
    },
    planner: settings.planner || exportedProgram.settings.planner,
    muscleGroups: settings.muscleGroups || exportedProgram.settings.muscleGroups,
    exerciseData: { ...settings.exerciseData, ...exportedProgram.settings.exerciseData },
    workoutSettings: { ...settings.workoutSettings, ...exportedProgram.settings.workoutSettings },
  };
  return result;
}

export function Settings_activeCustomExercises(settings: ISettings): IAllCustomExercises {
  return ObjectUtils_filter(settings.exercises, (k, v) => !v?.isDeleted);
}

export function Settings_getNextTargetType(type: ITargetType, skipPlatesCalculator: boolean): ITargetType {
  const index = targetTypes.indexOf(type);
  let nextTargetType: ITargetType;
  if (index === -1) {
    nextTargetType = targetTypes[0];
  } else if (index === targetTypes.length - 1) {
    nextTargetType = targetTypes[0];
  } else {
    nextTargetType = targetTypes[index + 1];
  }
  if (nextTargetType === "platescalculator" && skipPlatesCalculator) {
    nextTargetType = Settings_getNextTargetType("platescalculator", skipPlatesCalculator);
  }
  return nextTargetType;
}

export function Settings_toggleStarredExercise(dispatch: IDispatch, key: string): void {
  updateSettings(
    dispatch,
    lb<ISettings>()
      .p("starredExercises")
      .recordModify((starred) => {
        if (starred?.[key]) {
          delete starred[key];
        } else {
          starred = starred || {};
          starred[key] = true;
        }
        return starred;
      }),
    `Toggle starred exercise ${key}`
  );
}

export function Settings_changePickerSettings(dispatch: IDispatch, settings: IExercisePickerSettings): void {
  updateSettings(
    dispatch,
    lb<ISettings>()
      .p("workoutSettings")
      .recordModify((workoutSettings) => {
        return { ...workoutSettings, ...settings };
      }),
    `Change picker settings`
  );
}

export function Settings_doesProgramHaveUnset1RMs(program: IProgram, settings: ISettings): boolean {
  return Settings_getExercisesWithUnset1RMs(program, settings).length > 0;
}

export function Settings_getExercisesWithUnset1RMs(program: IProgram, settings: ISettings): IExercise[] {
  const evalutedProgram = Program_evaluate(program, settings);
  const plannerExercises = Program_getAllUsedProgramExercises(evalutedProgram).filter((exercise) => {
    return ProgramExercise_doesUse1RM(exercise);
  });
  const exerciseTypes = CollectionUtils_uniqByExpr(
    plannerExercises
      .filter((exercise) => {
        return settings.exerciseData[Exercise_toKey(exercise.exerciseType)]?.rm1 == null;
      })
      .map((exercise) => exercise.exerciseType),
    (e) => Exercise_toKey(e)
  );
  const exercises = exerciseTypes.map((e) => Exercise_get(e, settings.exercises));
  return CollectionUtils_sort(exercises, (a, b) => {
    return Exercise_nameWithEquipment(a, settings).localeCompare(Exercise_nameWithEquipment(b, settings));
  });
}

export function Settings_setOneRM(
  dispatch: IDispatch,
  exerciseType: IExerciseType,
  value: IWeight,
  settings: ISettings
): void {
  updateSettings(
    dispatch,
    lb<ISettings>()
      .p("exerciseData")
      .recordModify((data) => {
        const key = Exercise_toKey(exerciseType);
        return { ...data, [key]: { ...data[key], rm1: value } };
      }),
    `Set 1RM for ${Exercise_nameWithEquipment(Exercise_get(exerciseType, settings.exercises), settings)} to ${Weight_print(value)}`
  );
}

export function Settings_getTheme(settings: ISettings): "dark" | "light" {
  return settings.theme ? settings.theme : window.lftSystemDarkMode ? "dark" : "light";
}

export function Settings_applyTheme(theme?: "dark" | "light"): void {
  if (theme === "dark") {
    document.body.classList.add("dark");
    SendMessage_toIosAndAndroid({ type: "theme", value: "dark" });
  } else {
    document.body.classList.remove("dark");
    SendMessage_toIosAndAndroid({ type: "theme", value: "light" });
  }
}
