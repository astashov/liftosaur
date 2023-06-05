import { IProgramState } from "../../../types";

export interface IPlaygroundDetailsDaySetup {
  dayIndex: number;
  states: Partial<Record<string, IProgramState>>; // key - programExerciseId
}

export interface IPlaygroundDetailsWeekSetup {
  name: string;
  days: IPlaygroundDetailsDaySetup[];
}
