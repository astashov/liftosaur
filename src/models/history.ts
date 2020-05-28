import { IExcerciseType } from "./excercise";
import { ISet } from "./set";
import { IProgressUi, IProgressMode, Progress } from "./progress";
import { IProgramId } from "./program";

export interface IHistoryRecord {
  date: string; // ISO8601, like 2020-02-29T18:02:05+00:00
  programId: IProgramId;
  day: number;
  entries: IHistoryEntry[];
  startTime: number;
  id: number;

  endTime?: number;
  ui?: IProgressUi;
  timerSince?: number;
  timerMode?: IProgressMode;
}

export interface IHistoryEntry {
  excercise: IExcerciseType;
  sets: ISet[];
  warmupSets: ISet[];
}

export namespace History {
  export function finishProgramDay(progress: IHistoryRecord): IHistoryRecord {
    return {
      ...progress,
      id: Progress.isCurrent(progress) ? Date.now() : progress.id,
      timerSince: undefined,
      timerMode: undefined,
      endTime: Date.now(),
      ui: undefined,
    };
  }
}
