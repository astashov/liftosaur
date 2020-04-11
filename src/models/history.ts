import { IExcerciseType } from "./excercise";
import { IHistorySet, ISet } from "./set";
import { IProgress } from "./progress";
import { IProgram, IProgramId } from "./program";
import { IStats } from "./stats";

export interface IHistoryRecord {
  date: string; // ISO8601, like 2020-02-29T18:02:05+00:00
  programId: IProgramId;
  day: number;
  entries: IHistoryEntry[];
}

export interface IProgramRecord {
  programId: IProgramId;
  day: number;
  entries: IProgramEntry[];
}

export interface IHistoryEntry {
  excercise: IExcerciseType;
  sets: IHistorySet[];
}

export interface IProgramEntry {
  excercise: IExcerciseType;
  sets: ISet[];
}

export namespace History {
  export function finishProgramDay(program: IProgram, progress: IProgress, stats: IStats): IHistoryRecord {
    return {
      date: new Date().toISOString(),
      programId: program.id,
      day: progress.day,
      entries: progress.entries.map(entry => ({ ...entry }))
    };
  }
}
