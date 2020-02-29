type IExcerciseType =
  | "benchPress"
  | "squat"
  | "deadlift"
  | "overheadPress"
  | "chinups"
  | "barbellRows";

export type IExcercise = {
  name: string;
  startWeight: number;
};

export const excercises: Record<IExcerciseType, IExcercise> = {
  benchPress: {
    name: "Bench Press",
    startWeight: 45
  },
  squat: {
    name: "Squat",
    startWeight: 45
  },
  deadlift: {
    name: "Deadlift",
    startWeight: 95
  },
  overheadPress: {
    name: "Overhead Press",
    startWeight: 45
  },
  chinups: {
    name: "Chinups",
    startWeight: 0
  },
  barbellRows: {
    name: "Barbell Rows",
    startWeight: 95
  }
};
