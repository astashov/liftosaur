import { IWeight } from "./weight";

export type IExcerciseType = "benchPress" | "squat" | "deadlift" | "overheadPress" | "chinups" | "barbellRows";

export type IExcercise = {
  id: IExcerciseType;
  name: string;
  startWeight: IWeight;
};

export const excercises: Record<IExcerciseType, IExcercise> = {
  benchPress: {
    id: "benchPress",
    name: "Bench Press",
    startWeight: 45
  },
  squat: {
    id: "squat",
    name: "Squat",
    startWeight: 45
  },
  deadlift: {
    id: "deadlift",
    name: "Deadlift",
    startWeight: 95
  },
  overheadPress: {
    id: "overheadPress",
    name: "Overhead Press",
    startWeight: 45
  },
  chinups: {
    id: "chinups",
    name: "Chinups",
    startWeight: 0
  },
  barbellRows: {
    id: "barbellRows",
    name: "Barbell Rows",
    startWeight: 95
  }
};

export namespace Excercise {
  export function get(type: IExcerciseType): IExcercise {
    return excercises[type];
  }
}
