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
import { Weight } from "./weight";
import { IExportedProgram, Program } from "./program";
import { ObjectUtils } from "../utils/object";
import { lb } from "lens-shmens";
import { updateSettings } from "./state";
import { IDispatch } from "../ducks/types";
import { Exercise, IExercise } from "./exercise";
import { CollectionUtils } from "../utils/collection";
import { ProgramExercise } from "./programExercise";
import { IExercisePickerSettings } from "../components/exercisePicker/exercisePickerSettings";
import { SendMessage } from "../utils/sendMessage";

export namespace Settings {
  export function programContentBuild(): Pick<ISettings, "timers" | "units" | "planner"> {
    return {
      timers: {
        warmup: 90,
        workout: 180,
        reminder: 900,
      },
      units: "lb",
      planner: buildPlannerSettings(),
    };
  }

  export function defaultEquipment(): IAllEquipment {
    return {
      barbell: {
        vtype: "equipment_data",
        multiplier: 2,
        bar: {
          lb: Weight.build(45, "lb"),
          kg: Weight.build(20, "kg"),
        },
        plates: [
          { weight: Weight.build(45, "lb"), num: 8 },
          { weight: Weight.build(25, "lb"), num: 4 },
          { weight: Weight.build(10, "lb"), num: 4 },
          { weight: Weight.build(5, "lb"), num: 4 },
          { weight: Weight.build(2.5, "lb"), num: 4 },
          { weight: Weight.build(1.25, "lb"), num: 2 },
          { weight: Weight.build(20, "kg"), num: 8 },
          { weight: Weight.build(10, "kg"), num: 4 },
          { weight: Weight.build(5, "kg"), num: 4 },
          { weight: Weight.build(2.5, "kg"), num: 4 },
          { weight: Weight.build(1.25, "kg"), num: 4 },
          { weight: Weight.build(0.5, "kg"), num: 2 },
        ],
        fixed: [],
        isFixed: false,
      },
      trapbar: {
        vtype: "equipment_data",
        multiplier: 2,
        bar: {
          lb: Weight.build(45, "lb"),
          kg: Weight.build(20, "kg"),
        },
        plates: [
          { weight: Weight.build(45, "lb"), num: 8 },
          { weight: Weight.build(25, "lb"), num: 4 },
          { weight: Weight.build(10, "lb"), num: 4 },
          { weight: Weight.build(5, "lb"), num: 4 },
          { weight: Weight.build(2.5, "lb"), num: 4 },
          { weight: Weight.build(1.25, "lb"), num: 2 },
          { weight: Weight.build(20, "kg"), num: 8 },
          { weight: Weight.build(10, "kg"), num: 4 },
          { weight: Weight.build(5, "kg"), num: 4 },
          { weight: Weight.build(2.5, "kg"), num: 4 },
          { weight: Weight.build(1.25, "kg"), num: 4 },
          { weight: Weight.build(0.5, "kg"), num: 2 },
        ],
        fixed: [],
        isFixed: false,
      },
      leverageMachine: {
        vtype: "equipment_data",
        multiplier: 1,
        bar: {
          lb: Weight.build(0, "lb"),
          kg: Weight.build(0, "kg"),
        },
        plates: [
          { weight: Weight.build(45, "lb"), num: 8 },
          { weight: Weight.build(25, "lb"), num: 4 },
          { weight: Weight.build(10, "lb"), num: 4 },
          { weight: Weight.build(5, "lb"), num: 4 },
          { weight: Weight.build(2.5, "lb"), num: 4 },
          { weight: Weight.build(1.25, "lb"), num: 2 },
          { weight: Weight.build(20, "kg"), num: 8 },
          { weight: Weight.build(10, "kg"), num: 4 },
          { weight: Weight.build(5, "kg"), num: 4 },
          { weight: Weight.build(2.5, "kg"), num: 4 },
          { weight: Weight.build(1.25, "kg"), num: 4 },
          { weight: Weight.build(0.5, "kg"), num: 2 },
        ],
        fixed: [],
        isFixed: false,
      },
      smith: {
        vtype: "equipment_data",
        multiplier: 2,
        bar: {
          lb: Weight.build(45, "lb"),
          kg: Weight.build(20, "kg"),
        },
        plates: [
          { weight: Weight.build(45, "lb"), num: 8 },
          { weight: Weight.build(25, "lb"), num: 4 },
          { weight: Weight.build(10, "lb"), num: 4 },
          { weight: Weight.build(5, "lb"), num: 4 },
          { weight: Weight.build(2.5, "lb"), num: 4 },
          { weight: Weight.build(1.25, "lb"), num: 2 },
          { weight: Weight.build(20, "kg"), num: 8 },
          { weight: Weight.build(10, "kg"), num: 4 },
          { weight: Weight.build(5, "kg"), num: 4 },
          { weight: Weight.build(2.5, "kg"), num: 4 },
          { weight: Weight.build(1.25, "kg"), num: 4 },
          { weight: Weight.build(0.5, "kg"), num: 2 },
        ],
        fixed: [],
        isFixed: false,
      },
      dumbbell: {
        vtype: "equipment_data",
        multiplier: 2,
        bar: {
          lb: Weight.build(10, "lb"),
          kg: Weight.build(5, "kg"),
        },
        plates: [
          { weight: Weight.build(10, "lb"), num: 8 },
          { weight: Weight.build(5, "lb"), num: 4 },
          { weight: Weight.build(2.5, "lb"), num: 4 },
          { weight: Weight.build(1.25, "lb"), num: 2 },
          { weight: Weight.build(5, "kg"), num: 8 },
          { weight: Weight.build(2.5, "kg"), num: 4 },
          { weight: Weight.build(1.25, "kg"), num: 4 },
          { weight: Weight.build(0.5, "kg"), num: 2 },
        ],
        fixed: [
          Weight.build(10, "lb"),
          Weight.build(15, "lb"),
          Weight.build(20, "lb"),
          Weight.build(25, "lb"),
          Weight.build(30, "lb"),
          Weight.build(35, "lb"),
          Weight.build(40, "lb"),
          Weight.build(4, "kg"),
          Weight.build(6, "kg"),
          Weight.build(8, "kg"),
          Weight.build(10, "kg"),
          Weight.build(12, "kg"),
          Weight.build(14, "kg"),
          Weight.build(20, "kg"),
        ],
        isFixed: false,
      },
      ezbar: {
        vtype: "equipment_data",
        multiplier: 2,
        bar: {
          lb: Weight.build(20, "lb"),
          kg: Weight.build(10, "kg"),
        },
        plates: [
          { weight: Weight.build(45, "lb"), num: 8 },
          { weight: Weight.build(25, "lb"), num: 4 },
          { weight: Weight.build(10, "lb"), num: 4 },
          { weight: Weight.build(5, "lb"), num: 4 },
          { weight: Weight.build(2.5, "lb"), num: 4 },
          { weight: Weight.build(1.25, "lb"), num: 2 },
          { weight: Weight.build(20, "kg"), num: 8 },
          { weight: Weight.build(10, "kg"), num: 4 },
          { weight: Weight.build(5, "kg"), num: 4 },
          { weight: Weight.build(2.5, "kg"), num: 4 },
          { weight: Weight.build(1.25, "kg"), num: 4 },
          { weight: Weight.build(0.5, "kg"), num: 2 },
        ],
        fixed: [],
        isFixed: false,
      },
      cable: {
        vtype: "equipment_data",
        multiplier: 1,
        bar: {
          lb: Weight.build(0, "lb"),
          kg: Weight.build(0, "kg"),
        },
        plates: [
          {
            weight: Weight.build(10, "lb"),
            num: 20,
          },
          {
            weight: Weight.build(5, "lb"),
            num: 10,
          },
          {
            weight: Weight.build(5, "kg"),
            num: 20,
          },
          {
            weight: Weight.build(2.5, "kg"),
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
          lb: Weight.build(0, "lb"),
          kg: Weight.build(0, "kg"),
        },
        plates: [],
        fixed: [
          Weight.build(10, "lb"),
          Weight.build(15, "lb"),
          Weight.build(20, "lb"),
          Weight.build(25, "lb"),
          Weight.build(30, "lb"),
          Weight.build(35, "lb"),
          Weight.build(40, "lb"),
          Weight.build(4, "kg"),
          Weight.build(8, "kg"),
          Weight.build(12, "kg"),
          Weight.build(16, "kg"),
          Weight.build(24, "kg"),
        ],
        isFixed: true,
      },
    };
  }

  export function build(): ISettings {
    return {
      ...programContentBuild(),
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
          equipment: defaultEquipment(),
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
      planner: buildPlannerSettings(),
      muscleGroups: {
        vtype: "muscle_groups_settings",
        data: {},
      },
    };
  }

  export function buildPlannerSettings(): IPlannerSettings {
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

  export function applyExportedProgram(settings: ISettings, exportedProgram: IExportedProgram): ISettings {
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

  export function activeCustomExercises(settings: ISettings): IAllCustomExercises {
    return ObjectUtils.filter(settings.exercises, (k, v) => !v?.isDeleted);
  }

  export function getNextTargetType(type: ITargetType, skipPlatesCalculator: boolean): ITargetType {
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
      nextTargetType = getNextTargetType("platescalculator", skipPlatesCalculator);
    }
    return nextTargetType;
  }

  export function toggleStarredExercise(dispatch: IDispatch, key: string): void {
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

  export function changePickerSettings(dispatch: IDispatch, settings: IExercisePickerSettings): void {
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

  export function doesProgramHaveUnset1RMs(program: IProgram, settings: ISettings): boolean {
    return getExercisesWithUnset1RMs(program, settings).length > 0;
  }

  export function getExercisesWithUnset1RMs(program: IProgram, settings: ISettings): IExercise[] {
    const evalutedProgram = Program.evaluate(program, settings);
    const plannerExercises = Program.getAllUsedProgramExercises(evalutedProgram).filter((exercise) => {
      return ProgramExercise.doesUse1RM(exercise);
    });
    const exerciseTypes = CollectionUtils.uniqByExpr(
      plannerExercises
        .filter((exercise) => {
          return settings.exerciseData[Exercise.toKey(exercise.exerciseType)]?.rm1 == null;
        })
        .map((exercise) => exercise.exerciseType),
      (e) => Exercise.toKey(e)
    );
    const exercises = exerciseTypes.map((e) => Exercise.get(e, settings.exercises));
    return CollectionUtils.sort(exercises, (a, b) => {
      return Exercise.nameWithEquipment(a, settings).localeCompare(Exercise.nameWithEquipment(b, settings));
    });
  }

  export function setOneRM(
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
          const key = Exercise.toKey(exerciseType);
          return { ...data, [key]: { ...data[key], rm1: value } };
        }),
      `Set 1RM for ${Exercise.nameWithEquipment(Exercise.get(exerciseType, settings.exercises), settings)} to ${Weight.print(value)}`
    );
  }

  export function getTheme(settings: ISettings): "dark" | "light" {
    return settings.theme ? settings.theme : window.lftSystemDarkMode ? "dark" : "light";
  }

  export function applyTheme(theme?: "dark" | "light"): void {
    if (theme === "dark") {
      document.body.classList.add("dark");
      SendMessage.toIosAndAndroid({ type: "theme", value: "dark" });
    } else {
      document.body.classList.remove("dark");
      SendMessage.toIosAndAndroid({ type: "theme", value: "light" });
    }
  }
}
