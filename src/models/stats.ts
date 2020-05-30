import { IExcerciseType } from "./excercise";
import { IProgramId } from "./program";

export interface IStats {
  excercises: IStatsExcercises;
}

export type IStatsExcercises = { [P in IExcerciseType]?: IStatsExcercisesValue };

interface IStatsExcercisesValue {
  maxWeight: {
    timestamp: number;
    weight: number;
    reps: number;
    programId: IProgramId;
    day: number;
  }[];
}
