import { IProgramState } from "../../types";

export interface IProgramPreviewPlaygroundDaySetup {
  dayIndex: number;
  states: Partial<Record<string, IProgramState>>; // key - programExerciseId
}

export interface IProgramPreviewPlaygroundWeekSetup {
  name: string;
  days: IProgramPreviewPlaygroundDaySetup[];
}
