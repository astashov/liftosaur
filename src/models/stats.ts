import { IExcerciseType } from "./excercise";
import { IWeight } from "./weight";

export interface IStats {
  excercises: IStatsExcercises;
}

export type IStatsExcercises = { [P in IExcerciseType]?: IStatsExcercisesValue };

interface IStatsExcercisesValue {
  weights: {
    [key: string]: IWeight | undefined;
  };
}
