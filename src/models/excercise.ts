import { IWeight, Weight, IBars } from "./weight";
import { ISet } from "./set";
import * as t from "io-ts";
import { IArrayElement } from "../utils/types";
import { ISettings } from "./settings";

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
  startWeight: IWeight;
  warmupSets: (weight: IWeight, settings: ISettings) => ISet[];
  bar?: keyof IBars;
};

function warmup45(weight: IWeight, settings: ISettings): ISet[] {
  const percents = [];
  if (Weight.gt(weight, Weight.build(45, "lb"))) {
    percents.unshift(0.8);
  }
  if (Weight.gt(weight, Weight.build(80, "lb"))) {
    percents.unshift(0.5);
  }
  if (Weight.gt(weight, Weight.build(100, "lb"))) {
    percents.unshift(0.3);
  }
  return percents.map((percent) => {
    return {
      reps: 5,
      weight: Weight.max(Weight.build(45, "lb"), Weight.round(Weight.multiply(weight, percent), settings)),
    };
  });
}

function warmup10(weight: IWeight, settings: ISettings): ISet[] {
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
      weight: Weight.max(Weight.build(10, "lb"), Weight.round(Weight.multiply(weight, percent), settings)),
    };
  });
}

function warmup95(weight: IWeight, settings: ISettings): ISet[] {
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
      weight: Weight.max(Weight.build(45, "lb"), Weight.round(Weight.multiply(weight, percent), settings)),
    };
  });
}

function warmupEmpty(weight: IWeight): ISet[] {
  return [];
}

export const excercises: Record<IExcerciseType, IExcercise> = {
  benchPress: {
    id: "benchPress",
    name: "Bench Press",
    startWeight: Weight.build(45, "lb"),
    warmupSets: warmup45,
    bar: "barbell",
  },
  squat: {
    id: "squat",
    name: "Squat",
    startWeight: Weight.build(45, "lb"),
    warmupSets: warmup45,
    bar: "barbell",
  },
  deadlift: {
    id: "deadlift",
    name: "Deadlift",
    startWeight: Weight.build(95, "lb"),
    warmupSets: warmup95,
    bar: "barbell",
  },
  overheadPress: {
    id: "overheadPress",
    name: "Overhead Press",
    startWeight: Weight.build(45, "lb"),
    warmupSets: warmup45,
    bar: "barbell",
  },
  chinups: {
    id: "chinups",
    name: "Chinups",
    startWeight: Weight.build(0, "lb"),
    warmupSets: warmupEmpty,
  },
  pushups: {
    id: "pushups",
    name: "Pushups",
    startWeight: Weight.build(0, "lb"),
    warmupSets: warmupEmpty,
  },
  pullups: {
    id: "pullups",
    name: "Pullups",
    startWeight: Weight.build(0, "lb"),
    warmupSets: warmupEmpty,
  },
  legRaises: {
    id: "legRaises",
    name: "Leg Raises",
    startWeight: Weight.build(0, "lb"),
    warmupSets: warmupEmpty,
  },
  dips: {
    id: "dips",
    name: "Dips",
    startWeight: Weight.build(0, "lb"),
    warmupSets: warmupEmpty,
  },
  singleLegSplitSquat: {
    id: "singleLegSplitSquat",
    name: "Single Leg Split Squat",
    startWeight: Weight.build(0, "lb"),
    warmupSets: warmupEmpty,
  },
  invertedRows: {
    id: "invertedRows",
    name: "Inverted Rows",
    startWeight: Weight.build(0, "lb"),
    warmupSets: warmupEmpty,
  },
  barbellRows: {
    id: "barbellRows",
    name: "Barbell Rows",
    startWeight: Weight.build(95, "lb"),
    warmupSets: warmup95,
    bar: "barbell",
  },
  dbLateralRaise: {
    id: "dbLateralRaise",
    name: "Dumbbell Lateral Raise",
    startWeight: Weight.build(25, "lb"),
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  dbBenchPress: {
    id: "dbBenchPress",
    name: "Dumbbell Bench Press",
    startWeight: Weight.build(30, "lb"),
    bar: "dumbbell",
    warmupSets: warmup10,
  },
  dbInclineFly: {
    id: "dbInclineFly",
    name: "Dumbbell Incline Fly",
    startWeight: Weight.build(20, "lb"),
    warmupSets: warmup10,
    bar: "dumbbell",
  },
  dbArnoldPress: {
    id: "dbArnoldPress",
    name: "Dumbbell Arnold Press",
    startWeight: Weight.build(20, "lb"),
    warmupSets: warmup10,
    bar: "dumbbell",
  },
  dbTricepsExtension: {
    id: "dbTricepsExtension",
    name: "Dumbbell Triceps Extension",
    startWeight: Weight.build(20, "lb"),
    warmupSets: warmup10,
    bar: "dumbbell",
  },
  inclineDbBenchPress: {
    id: "inclineDbBenchPress",
    name: "Incline Dumbbell Bench Press",
    startWeight: Weight.build(50, "lb"),
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  dbShrug: {
    id: "dbShrug",
    name: "Dumbbell Shrug",
    startWeight: Weight.build(25, "lb"),
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  cableCrunch: {
    id: "cableCrunch",
    name: "Cable Crunch",
    startWeight: Weight.build(50, "lb"),
    warmupSets: warmupEmpty,
  },
  tricepsPushdown: {
    id: "tricepsPushdown",
    name: "Triceps Pushdown",
    startWeight: Weight.build(50, "lb"),
    warmupSets: warmupEmpty,
  },
  neutralGripChinup: {
    id: "neutralGripChinup",
    name: "Neutral Grip Chinup",
    startWeight: Weight.build(0, "lb"),
    warmupSets: warmupEmpty,
  },
  plank: {
    id: "plank",
    name: "Plank",
    startWeight: Weight.build(0, "lb"),
    warmupSets: warmupEmpty,
  },
  dbRow: {
    id: "dbRow",
    name: "Dumbbell Row",
    startWeight: Weight.build(50, "lb"),
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  dbOverheadPress: {
    id: "dbOverheadPress",
    name: "Dumbbell Overhead Press",
    startWeight: Weight.build(40, "lb"),
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  bulgarianSplitSquat: {
    id: "bulgarianSplitSquat",
    name: "Bulgarian Split Squat",
    startWeight: Weight.build(0, "lb"),
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  dbSingleLegDeadlift: {
    id: "dbSingleLegDeadlift",
    name: "Dumbbell Single Leg Deadlift",
    startWeight: Weight.build(30, "lb"),
    warmupSets: warmup10,
    bar: "dumbbell",
  },
  dbGobletSquat: {
    id: "dbGobletSquat",
    name: "Goblet Squat",
    startWeight: Weight.build(30, "lb"),
    warmupSets: warmup10,
    bar: "dumbbell",
  },
  dbCalfRaise: {
    id: "dbCalfRaise",
    name: "Dumbbell Calf Raise",
    startWeight: Weight.build(30, "lb"),
    warmupSets: warmup10,
    bar: "dumbbell",
  },
  paloffPressWithBand: {
    id: "paloffPressWithBand",
    name: "Paloff Press With Band",
    startWeight: Weight.build(0, "lb"),
    warmupSets: warmupEmpty,
  },
  dbLunge: {
    id: "dbLunge",
    name: "Dumbbell Lunge",
    startWeight: Weight.build(25, "lb"),
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  dbSwing: {
    id: "dbSwing",
    name: "Dumbbell Swing",
    startWeight: Weight.build(25, "lb"),
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  dbBicepCurl: {
    id: "dbBicepCurl",
    name: "Dumbbell Bicep Curl",
    startWeight: Weight.build(25, "lb"),
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  skullcrusher: {
    id: "skullcrusher",
    name: "Skullcrusher",
    startWeight: Weight.build(40, "lb"),
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
