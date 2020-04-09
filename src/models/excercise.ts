import { IWeight, Weight } from "./weight";
import { IProgressSet, IHistorySet } from "./set";

export type IExcerciseType = "benchPress" | "squat" | "deadlift" | "overheadPress" | "chinups" | "barbellRows";

export type IExcercise = {
  id: IExcerciseType;
  name: string;
  startWeight: IWeight;
  warmupSets: (weight: IWeight) => IHistorySet[];
};

function warmup45(weight: IWeight): IHistorySet[] {
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
  return percents.map(percent => ({ reps: 5, weight: Math.max(45, Weight.round(percent * weight)) }));
}

function warmup95(weight: IWeight): IHistorySet[] {
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
  return percents.map(percent => ({ reps: 5, weight: Math.max(45, Weight.round(percent * weight)) }));
}

export const excercises: Record<IExcerciseType, IExcercise> = {
  benchPress: {
    id: "benchPress",
    name: "Bench Press",
    startWeight: 45,
    warmupSets: warmup45
  },
  squat: {
    id: "squat",
    name: "Squat",
    startWeight: 45,
    warmupSets: warmup45
  },
  deadlift: {
    id: "deadlift",
    name: "Deadlift",
    startWeight: 95,
    warmupSets: warmup95
  },
  overheadPress: {
    id: "overheadPress",
    name: "Overhead Press",
    startWeight: 45,
    warmupSets: warmup45
  },
  chinups: {
    id: "chinups",
    name: "Chinups",
    startWeight: 0,
    warmupSets: weight => []
  },
  barbellRows: {
    id: "barbellRows",
    name: "Barbell Rows",
    startWeight: 95,
    warmupSets: warmup95
  }
};

export namespace Excercise {
  export function get(type: IExcerciseType): IExcercise {
    return excercises[type];
  }

  export function getWarmupSets(excercise: IExcerciseType, weight: IWeight): IHistorySet[] {
    return get(excercise).warmupSets(weight);
  }

  export function getWarmupProgressSets(excercise: IExcerciseType, weight: IWeight): IProgressSet[] {
    return getWarmupSets(excercise, weight).map(s => ({ weight: s.weight }));
  }
}
