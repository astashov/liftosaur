import { IExcercise } from "./excercise";

export interface IHistoryRecord {
  date: string; // ISO8601, like 2020-02-29T18:02:05+00:00
  entries: IHistoryEntry[];
}

export interface IHistoryEntry {
  excercise: IExcercise;
  reps: (number | undefined)[];
  weight: number;
}
