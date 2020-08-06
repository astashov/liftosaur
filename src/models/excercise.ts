import { IWeight, Weight, IBars } from "./weight";
import { ISet } from "./set";
import * as t from "io-ts";
import { IArrayElement } from "../utils/types";
import { ISettings, Settings } from "./settings";

export const excerciseTypes = [
  "benchPress",
  "squat",
  "deadlift",
  "overheadPress",
  "chinups",
  "barbellRows",
  "pushups",
  "pullups",
  "dips",
  "legRaises",
  "singleLegSplitSquat",
  "invertedRows",
  "dbLateralRaise",
  "inclineDbBenchPress",
  "dbInclineFly",
  "dbArnoldPress",
  "dbBenchPress",
  "dbShrug",
  "cableCrunch",
  "tricepsPushdown",
  "dbTricepsExtension",
  "neutralGripChinup",
  "plank",
  "dbRow",
  "dbOverheadPress",
  "dbSingleLegDeadlift",
  "dbGobletSquat",
  "dbCalfRaise",
  "bulgarianSplitSquat",
  "paloffPressWithBand",
  "dbLunge",
  "dbSwing",
  "dbBicepCurl",
  "skullcrusher",
] as const;

export const TExcerciseType = t.keyof(
  excerciseTypes.reduce<Record<IArrayElement<typeof excerciseTypes>, null>>((memo, excerciseType) => {
    memo[excerciseType] = null;
    return memo;
  }, {} as Record<IArrayElement<typeof excerciseTypes>, null>),
  "TExcerciseType"
);

export type IExcerciseType = t.TypeOf<typeof TExcerciseType>;

export type IExcercise = {
  id: IExcerciseType;
  name: string;
  warmupSets: (weight: IWeight, settings: ISettings) => ISet[];
  bar?: keyof IBars;
};

function warmup45(excerciseType: IExcerciseType): (weight: IWeight, settings: ISettings) => ISet[] {
  return (weight: IWeight, settings: ISettings): ISet[] => {
    const excercise = Excercise.get(excerciseType);
    const percents = [];
    if (Weight.gt(weight, Weight.build(20, "kg"))) {
      percents.unshift(0.8);
    }
    if (Weight.gt(weight, Weight.build(40, "kg"))) {
      percents.unshift(0.5);
    }
    if (Weight.gt(weight, Weight.build(50, "kg"))) {
      percents.unshift(0.3);
    }
    return percents.map((percent) => {
      return {
        reps: 5,
        weight: Weight.convertTo(
          Weight.max(
            excercise.bar != null ? Settings.bars(settings)[excercise.bar] : Weight.build(0, settings.units),
            Weight.roundConvertTo(excerciseType, Weight.multiply(weight, percent), settings)
          ),
          settings.units
        ),
      };
    });
  };
}

function warmup10(excerciseType: IExcerciseType): (weight: IWeight, settings: ISettings) => ISet[] {
  return (weight: IWeight, settings: ISettings): ISet[] => {
    const excercise = Excercise.get(excerciseType);
    const percents = [];
    if (Weight.gt(weight, Weight.build(10, "lb"))) {
      percents.unshift(0.8);
    }
    if (Weight.gt(weight, Weight.build(30, "lb"))) {
      percents.unshift(0.5);
    }
    if (Weight.gt(weight, Weight.build(60, "lb"))) {
      percents.unshift(0.3);
    }
    return percents.map((percent) => {
      return {
        reps: 5,
        weight: Weight.max(
          excercise.bar != null ? Settings.bars(settings)[excercise.bar] : Weight.build(0, settings.units),
          Weight.roundConvertTo(excerciseType, Weight.multiply(weight, percent), settings)
        ),
      };
    });
  };
}

function warmup95(excerciseType: IExcerciseType): (weight: IWeight, settings: ISettings) => ISet[] {
  return (weight: IWeight, settings: ISettings): ISet[] => {
    const excercise = Excercise.get(excerciseType);
    const percents = [];
    if (Weight.gt(weight, Weight.build(95, "lb"))) {
      percents.unshift(0.8);
    }
    if (Weight.gt(weight, Weight.build(125, "lb"))) {
      percents.unshift(0.5);
    }
    if (Weight.gt(weight, Weight.build(150, "lb"))) {
      percents.unshift(0.3);
    }
    return percents.map((percent) => {
      return {
        reps: 5,
        weight: Weight.max(
          excercise.bar != null ? Settings.bars(settings)[excercise.bar] : Weight.build(0, settings.units),
          Weight.roundConvertTo(excerciseType, Weight.multiply(weight, percent), settings)
        ),
      };
    });
  };
}

function warmupEmpty(weight: IWeight): ISet[] {
  return [];
}

export const excercises: Record<IExcerciseType, IExcercise> = {
  benchPress: {
    id: "benchPress",
    name: "Bench Press",
    warmupSets: warmup45("benchPress"),
    bar: "barbell",
  },
  squat: {
    id: "squat",
    name: "Squat",
    warmupSets: warmup45("squat"),
    bar: "barbell",
  },
  deadlift: {
    id: "deadlift",
    name: "Deadlift",
    warmupSets: warmup95("deadlift"),
    bar: "barbell",
  },
  overheadPress: {
    id: "overheadPress",
    name: "Overhead Press",
    warmupSets: warmup45("overheadPress"),
    bar: "barbell",
  },
  chinups: {
    id: "chinups",
    name: "Chinups",
    warmupSets: warmupEmpty,
  },
  pushups: {
    id: "pushups",
    name: "Pushups",
    warmupSets: warmupEmpty,
  },
  pullups: {
    id: "pullups",
    name: "Pullups",
    warmupSets: warmupEmpty,
  },
  legRaises: {
    id: "legRaises",
    name: "Leg Raises",
    warmupSets: warmupEmpty,
  },
  dips: {
    id: "dips",
    name: "Dips",
    warmupSets: warmupEmpty,
  },
  singleLegSplitSquat: {
    id: "singleLegSplitSquat",
    name: "Single Leg Split Squat",
    warmupSets: warmupEmpty,
  },
  invertedRows: {
    id: "invertedRows",
    name: "Inverted Rows",
    warmupSets: warmupEmpty,
  },
  barbellRows: {
    id: "barbellRows",
    name: "Barbell Rows",
    warmupSets: warmup95("barbellRows"),
    bar: "barbell",
  },
  dbLateralRaise: {
    id: "dbLateralRaise",
    name: "Dumbbell Lateral Raise",
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  dbBenchPress: {
    id: "dbBenchPress",
    name: "Dumbbell Bench Press",
    bar: "dumbbell",
    warmupSets: warmup10("dbBenchPress"),
  },
  dbInclineFly: {
    id: "dbInclineFly",
    name: "Dumbbell Incline Fly",
    warmupSets: warmup10("dbInclineFly"),
    bar: "dumbbell",
  },
  dbArnoldPress: {
    id: "dbArnoldPress",
    name: "Dumbbell Arnold Press",
    warmupSets: warmup10("dbArnoldPress"),
    bar: "dumbbell",
  },
  dbTricepsExtension: {
    id: "dbTricepsExtension",
    name: "Dumbbell Triceps Extension",
    warmupSets: warmup10("dbTricepsExtension"),
    bar: "dumbbell",
  },
  inclineDbBenchPress: {
    id: "inclineDbBenchPress",
    name: "Incline Dumbbell Bench Press",
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  dbShrug: {
    id: "dbShrug",
    name: "Dumbbell Shrug",
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  cableCrunch: {
    id: "cableCrunch",
    name: "Cable Crunch",
    warmupSets: warmupEmpty,
  },
  tricepsPushdown: {
    id: "tricepsPushdown",
    name: "Triceps Pushdown",
    warmupSets: warmupEmpty,
  },
  neutralGripChinup: {
    id: "neutralGripChinup",
    name: "Neutral Grip Chinup",
    warmupSets: warmupEmpty,
  },
  plank: {
    id: "plank",
    name: "Plank",
    warmupSets: warmupEmpty,
  },
  dbRow: {
    id: "dbRow",
    name: "Dumbbell Row",
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  dbOverheadPress: {
    id: "dbOverheadPress",
    name: "Dumbbell Overhead Press",
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  bulgarianSplitSquat: {
    id: "bulgarianSplitSquat",
    name: "Bulgarian Split Squat",
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  dbSingleLegDeadlift: {
    id: "dbSingleLegDeadlift",
    name: "Dumbbell Single Leg Deadlift",
    warmupSets: warmup10("dbSingleLegDeadlift"),
    bar: "dumbbell",
  },
  dbGobletSquat: {
    id: "dbGobletSquat",
    name: "Goblet Squat",
    warmupSets: warmup10("dbGobletSquat"),
    bar: "dumbbell",
  },
  dbCalfRaise: {
    id: "dbCalfRaise",
    name: "Dumbbell Calf Raise",
    warmupSets: warmup10("dbCalfRaise"),
    bar: "dumbbell",
  },
  paloffPressWithBand: {
    id: "paloffPressWithBand",
    name: "Paloff Press With Band",
    warmupSets: warmupEmpty,
  },
  dbLunge: {
    id: "dbLunge",
    name: "Dumbbell Lunge",
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  dbSwing: {
    id: "dbSwing",
    name: "Dumbbell Swing",
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  dbBicepCurl: {
    id: "dbBicepCurl",
    name: "Dumbbell Bicep Curl",
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  skullcrusher: {
    id: "skullcrusher",
    name: "Skullcrusher",
    warmupSets: warmupEmpty,
    bar: "ezbar",
  },
};

export namespace Excercise {
  export function get(type: IExcerciseType): IExcercise {
    return excercises[type];
  }

  export function getWarmupSets(excercise: IExcerciseType, weight: IWeight, settings: ISettings): ISet[] {
    return get(excercise).warmupSets(weight, settings);
  }
}
