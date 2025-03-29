import { ISettings, IPlannerSettings, IAllEquipment, IAllCustomExercises, ITargetType, targetTypes } from "../types";
import { Weight } from "./weight";
import { IExportedProgram } from "./program";
import { ObjectUtils } from "../utils/object";

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
      equipment: defaultEquipment(),
      exercises: {},
      graphs: [],
      planner: buildPlannerSettings(),
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
    return {
      ...settings,
      exercises: {
        ...settings.exercises,
        ...exportedProgram.customExercises,
      },
      units: exportedProgram.settings.units || settings.units,
      timers: {
        ...settings.timers,
        workout: exportedProgram.settings.timers?.workout || settings.timers.workout,
        warmup: exportedProgram.settings.timers?.warmup || settings.timers.warmup,
      },
      planner: exportedProgram.settings.planner || settings.planner,
    };
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
}
