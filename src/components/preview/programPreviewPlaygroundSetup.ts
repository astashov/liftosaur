import { IHistoryRecord, IProgram, IProgramState, ISettings } from "../../types";

export interface IProgramPreviewPlaygroundDaySetup {
  day: number;
  states: Partial<Record<string, IProgramState>>; // key - programExerciseId
}

export interface IProgramPreviewPlaygroundWeekSetup {
  name: string;
  days: IProgramPreviewPlaygroundDaySetup[];
}

export type IProgramPreviewPlaygroundDaySetupWithProgress = IProgramPreviewPlaygroundDaySetup & {
  progress: IHistoryRecord;
};

export type IProgramPreviewPlaygroundProgresses = (IProgramPreviewPlaygroundWeekSetup & {
  days: IProgramPreviewPlaygroundDaySetupWithProgress[];
})[];

export interface IProgramPreviewPlaygroundState {
  program: IProgram;
  settings: ISettings;
  isPlayground: boolean;
  progresses: IProgramPreviewPlaygroundProgresses;
}
