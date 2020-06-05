import { IWeight, Weight, IBars } from "./weight";
import { ISet } from "./set";

export type IExcerciseType =
  | "benchPress"
  | "squat"
  | "deadlift"
  | "overheadPress"
  | "chinups"
  | "barbellRows"
  | "pushups"
  | "pullups"
  | "dips"
  | "legRaises"
  | "singleLegSplitSquat"
  | "invertedRows"
  | "dbLateralRaise"
  | "inclineDbBenchPress"
  | "dbInclineFly"
  | "dbArnoldPress"
  | "dbBenchPress"
  | "dbShrug"
  | "cableCrunch"
  | "tricepsPushdown"
  | "dbTricepsExtension"
  | "neutralGripChinup"
  | "plank"
  | "dbRow"
  | "dbOverheadPress"
  | "dbSingleLegDeadlift"
  | "dbGobletSquat"
  | "dbCalfRaise"
  | "bulgarianSplitSquat"
  | "paloffPressWithBand"
  | "dbLunge"
  | "dbSwing"
  | "dbBicepCurl"
  | "skullcrusher";

export type IExcercise = {
  id: IExcerciseType;
  name: string;
  startWeight: IWeight;
  warmupSets: (weight: IWeight) => ISet[];
  bar?: keyof IBars;
};

function warmup45(weight: IWeight): ISet[] {
  const percents = [];
  if (weight > 45) {
    percents.unshift(0.8);
  }
  if (weight > 80) {
    percents.unshift(0.5);
  }
  if (weight > 100) {
    percents.unshift(0.3);
  }
  return percents.map((percent) => ({ reps: 5, weight: Math.max(45, Weight.round(percent * weight)) }));
}

function warmup10(weight: IWeight): ISet[] {
  const percents = [];
  if (weight > 10) {
    percents.unshift(0.8);
  }
  if (weight > 30) {
    percents.unshift(0.5);
  }
  if (weight > 60) {
    percents.unshift(0.3);
  }
  return percents.map((percent) => ({ reps: 5, weight: Math.max(10, Weight.round(percent * weight)) }));
}

function warmup95(weight: IWeight): ISet[] {
  const percents = [];
  if (weight > 95) {
    percents.unshift(0.8);
  }
  if (weight > 125) {
    percents.unshift(0.5);
  }
  if (weight > 150) {
    percents.unshift(0.3);
  }
  return percents.map((percent) => ({ reps: 5, weight: Math.max(45, Weight.round(percent * weight)) }));
}

function warmupEmpty(weight: IWeight): ISet[] {
  return [];
}

export const excercises: Record<IExcerciseType, IExcercise> = {
  benchPress: {
    id: "benchPress",
    name: "Bench Press",
    startWeight: 45,
    warmupSets: warmup45,
    bar: "barbell",
  },
  squat: {
    id: "squat",
    name: "Squat",
    startWeight: 45,
    warmupSets: warmup45,
    bar: "barbell",
  },
  deadlift: {
    id: "deadlift",
    name: "Deadlift",
    startWeight: 95,
    warmupSets: warmup95,
    bar: "barbell",
  },
  overheadPress: {
    id: "overheadPress",
    name: "Overhead Press",
    startWeight: 45,
    warmupSets: warmup45,
    bar: "barbell",
  },
  chinups: {
    id: "chinups",
    name: "Chinups",
    startWeight: 0,
    warmupSets: warmupEmpty,
  },
  pushups: {
    id: "pushups",
    name: "Pushups",
    startWeight: 0,
    warmupSets: warmupEmpty,
  },
  pullups: {
    id: "pullups",
    name: "Pullups",
    startWeight: 0,
    warmupSets: warmupEmpty,
  },
  legRaises: {
    id: "legRaises",
    name: "Leg Raises",
    startWeight: 0,
    warmupSets: warmupEmpty,
  },
  dips: {
    id: "dips",
    name: "Dips",
    startWeight: 0,
    warmupSets: warmupEmpty,
  },
  singleLegSplitSquat: {
    id: "singleLegSplitSquat",
    name: "Single Leg Split Squat",
    startWeight: 0,
    warmupSets: warmupEmpty,
  },
  invertedRows: {
    id: "invertedRows",
    name: "Inverted Rows",
    startWeight: 0,
    warmupSets: warmupEmpty,
  },
  barbellRows: {
    id: "barbellRows",
    name: "Barbell Rows",
    startWeight: 95,
    warmupSets: warmup95,
    bar: "barbell",
  },
  dbLateralRaise: {
    id: "dbLateralRaise",
    name: "Dumbbell Lateral Raise",
    startWeight: 25,
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  dbBenchPress: {
    id: "dbBenchPress",
    name: "Dumbbell Bench Press",
    startWeight: 30,
    bar: "dumbbell",
    warmupSets: warmup10,
  },
  dbInclineFly: {
    id: "dbInclineFly",
    name: "Dumbbell Incline Fly",
    startWeight: 20,
    warmupSets: warmup10,
    bar: "dumbbell",
  },
  dbArnoldPress: {
    id: "dbArnoldPress",
    name: "Dumbbell Arnold Press",
    startWeight: 20,
    warmupSets: warmup10,
    bar: "dumbbell",
  },
  dbTricepsExtension: {
    id: "dbTricepsExtension",
    name: "Dumbbell Triceps Extension",
    startWeight: 20,
    warmupSets: warmup10,
    bar: "dumbbell",
  },
  inclineDbBenchPress: {
    id: "inclineDbBenchPress",
    name: "Incline Dumbbell Bench Press",
    startWeight: 50,
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  dbShrug: {
    id: "dbShrug",
    name: "Dumbbell Shrug",
    startWeight: 25,
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  cableCrunch: {
    id: "cableCrunch",
    name: "Cable Crunch",
    startWeight: 50,
    warmupSets: warmupEmpty,
  },
  tricepsPushdown: {
    id: "tricepsPushdown",
    name: "Triceps Pushdown",
    startWeight: 50,
    warmupSets: warmupEmpty,
  },
  neutralGripChinup: {
    id: "neutralGripChinup",
    name: "Neutral Grip Chinup",
    startWeight: 0,
    warmupSets: warmupEmpty,
  },
  plank: {
    id: "plank",
    name: "Plank",
    startWeight: 0,
    warmupSets: warmupEmpty,
  },
  dbRow: {
    id: "dbRow",
    name: "Dumbbell Row",
    startWeight: 50,
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  dbOverheadPress: {
    id: "dbOverheadPress",
    name: "Dumbbell Overhead Press",
    startWeight: 40,
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  bulgarianSplitSquat: {
    id: "bulgarianSplitSquat",
    name: "Bulgarian Split Squat",
    startWeight: 0,
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  dbSingleLegDeadlift: {
    id: "dbSingleLegDeadlift",
    name: "Dumbbell Single Leg Deadlift",
    startWeight: 30,
    warmupSets: warmup10,
    bar: "dumbbell",
  },
  dbGobletSquat: {
    id: "dbGobletSquat",
    name: "Goblet Squat",
    startWeight: 30,
    warmupSets: warmup10,
    bar: "dumbbell",
  },
  dbCalfRaise: {
    id: "dbCalfRaise",
    name: "Dumbbell Calf Raise",
    startWeight: 30,
    warmupSets: warmup10,
    bar: "dumbbell",
  },
  paloffPressWithBand: {
    id: "paloffPressWithBand",
    name: "Paloff Press With Band",
    startWeight: 0,
    warmupSets: warmupEmpty,
  },
  dbLunge: {
    id: "dbLunge",
    name: "Dumbbell Lunge",
    startWeight: 25,
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  dbSwing: {
    id: "dbSwing",
    name: "Dumbbell Swing",
    startWeight: 25,
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  dbBicepCurl: {
    id: "dbBicepCurl",
    name: "Dumbbell Bicep Curl",
    startWeight: 25,
    warmupSets: warmupEmpty,
    bar: "dumbbell",
  },
  skullcrusher: {
    id: "skullcrusher",
    name: "Skullcrusher",
    startWeight: 40,
    warmupSets: warmupEmpty,
    bar: "ezbar",
  },
};

export namespace Excercise {
  export function get(type: IExcerciseType): IExcercise {
    return excercises[type];
  }

  export function getWarmupSets(excercise: IExcerciseType, weight: IWeight): ISet[] {
    return get(excercise).warmupSets(weight);
  }
}
