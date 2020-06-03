import { IWeight, Weight } from "./weight";
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
  | "dbBicepCurl";

export type IExcercise = {
  id: IExcerciseType;
  name: string;
  startWeight: IWeight;
  warmupSets: (weight: IWeight) => ISet[];
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
  },
  squat: {
    id: "squat",
    name: "Squat",
    startWeight: 45,
    warmupSets: warmup45,
  },
  deadlift: {
    id: "deadlift",
    name: "Deadlift",
    startWeight: 95,
    warmupSets: warmup95,
  },
  overheadPress: {
    id: "overheadPress",
    name: "Overhead Press",
    startWeight: 45,
    warmupSets: warmup45,
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
  },
  dbLateralRaise: {
    id: "dbLateralRaise",
    name: "Dumbbell Lateral Raise",
    startWeight: 25,
    warmupSets: warmupEmpty,
  },
  dbBenchPress: {
    id: "dbBenchPress",
    name: "Dumbbell Bench Press",
    startWeight: 30,
    warmupSets: warmup10,
  },
  dbInclineFly: {
    id: "dbInclineFly",
    name: "Dumbbell Incline Fly",
    startWeight: 20,
    warmupSets: warmup10,
  },
  dbArnoldPress: {
    id: "dbArnoldPress",
    name: "Dumbbell Arnold Press",
    startWeight: 20,
    warmupSets: warmup10,
  },
  dbTricepsExtension: {
    id: "dbTricepsExtension",
    name: "Dumbbell Triceps Extension",
    startWeight: 20,
    warmupSets: warmup10,
  },
  inclineDbBenchPress: {
    id: "inclineDbBenchPress",
    name: "Incline Dumbbell Bench Press",
    startWeight: 50,
    warmupSets: warmupEmpty,
  },
  dbShrug: {
    id: "dbShrug",
    name: "Dumbbell Shrug",
    startWeight: 25,
    warmupSets: warmupEmpty,
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
  },
  dbOverheadPress: {
    id: "dbOverheadPress",
    name: "Dumbbell Overhead Press",
    startWeight: 40,
    warmupSets: warmupEmpty,
  },
  bulgarianSplitSquat: {
    id: "bulgarianSplitSquat",
    name: "Bulgarian Split Squat",
    startWeight: 0,
    warmupSets: warmupEmpty,
  },
  dbSingleLegDeadlift: {
    id: "dbSingleLegDeadlift",
    name: "Dumbbell Single Leg Deadlift",
    startWeight: 30,
    warmupSets: warmup10,
  },
  dbGobletSquat: {
    id: "dbGobletSquat",
    name: "Goblet Squat",
    startWeight: 30,
    warmupSets: warmup10,
  },
  dbCalfRaise: {
    id: "dbCalfRaise",
    name: "Dumbbell Calf Raise",
    startWeight: 30,
    warmupSets: warmup10,
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
  },
  dbSwing: {
    id: "dbSwing",
    name: "Dumbbell Swing",
    startWeight: 25,
    warmupSets: warmupEmpty,
  },
  dbBicepCurl: {
    id: "dbBicepCurl",
    name: "Dumbbell Bicep Curl",
    startWeight: 25,
    warmupSets: warmupEmpty,
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
