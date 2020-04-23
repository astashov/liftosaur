import { IExcerciseType } from "./excercise";
import { ISet } from "./set";
import { IProgress } from "./progress";
import { IProgramId } from "./program";

export interface IHistoryRecord {
  id: number;
  date?: string; // ISO8601, like 2020-02-29T18:02:05+00:00
  programId: IProgramId;
  day: number;
  startTime: number;
  endTime: number;
  entries: IHistoryEntry[];
}

export interface IHistoryEntry {
  excercise: IExcerciseType;
  sets: ISet[];
}

export namespace History {
  export function finishProgramDay(programId: IProgramId, progress: IProgress): IHistoryRecord {
    return {
      id: progress.historyRecord?.id || Date.now(),
      date: progress.historyRecord?.date ? progress.historyRecord.date : new Date().toISOString(),
      programId: programId,
      day: progress.day,
      entries: progress.entries.map(entry => JSON.parse(JSON.stringify(entry))),
      startTime: progress.startTime,
      endTime: Date.now()
    };
  }
}
