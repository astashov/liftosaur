import { IExcercise } from "./excercise";
import { IProgress } from "./progress";

export interface IHistoryRecord {
  date: string; // ISO8601, like 2020-02-29T18:02:05+00:00
  programName: string;
  day: number;
  entries: IHistoryEntry[];
}

export interface IHistoryEntry {
  excercise: IExcercise;
  reps: (number | undefined)[];
  weight: number;
}

export namespace History {
  export function finishProgramDay(programName: string, progress: IProgress): IHistoryRecord {
    return {
      date: new Date().toISOString(),
      programName,
      day: progress.day,
      entries: progress.entries
    };
  }
}
