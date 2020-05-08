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
  | "invertedRows";

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
    warmupSets: (weight) => [],
  },
  pushups: {
    id: "pushups",
    name: "Pushups",
    startWeight: 0,
    warmupSets: (weight) => [],
  },
  pullups: {
    id: "pullups",
    name: "Pullups",
    startWeight: 0,
    warmupSets: (weight) => [],
  },
  legRaises: {
    id: "legRaises",
    name: "Leg Raises",
    startWeight: 0,
    warmupSets: (weight) => [],
  },
  dips: {
    id: "dips",
    name: "Dips",
    startWeight: 0,
    warmupSets: (weight) => [],
  },
  singleLegSplitSquat: {
    id: "singleLegSplitSquat",
    name: "Single Leg Split Squat",
    startWeight: 0,
    warmupSets: (weight) => [],
  },
  invertedRows: {
    id: "invertedRows",
    name: "Inverted Rows",
    startWeight: 0,
    warmupSets: (weight) => [],
  },
  barbellRows: {
    id: "barbellRows",
    name: "Barbell Rows",
    startWeight: 95,
    warmupSets: warmup95,
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
