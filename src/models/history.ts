import { IExcercise } from "./excercise";
import { IHistorySet, Reps, ISet } from "./set";
import { IProgress } from "./progress";
import { IProgram, IProgramId } from "./program";

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
  excercise: IExcercise;
  sets: IHistorySet[];
}

export interface IProgramEntry {
  excercise: IExcercise;
  sets: ISet[];
}

export namespace History {
  export function finishProgramDay(program: IProgram, progress: IProgress): IHistoryRecord {
    return {
      date: new Date().toISOString(),
      programId: program.id,
      day: progress.day,
      entries: History.toHistoryEntries(progress)
    };
  }

  export function toHistoryEntries(progress: IProgress): IHistoryEntry[] {
    return progress.entries.map(entry => ({ ...entry, sets: Reps.completeSets(entry.sets) }));
  }
}
