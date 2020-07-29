import { TExcerciseType } from "./excercise";
import { TSet } from "./set";
import { Progress, TProgressUi, TProgressMode } from "./progress";
import * as t from "io-ts";

export const THistoryEntry = t.type(
  {
    excercise: TExcerciseType,
    sets: t.array(TSet),
    warmupSets: t.array(TSet),
  },
  "THistoryEntry"
);
export type IHistoryEntry = t.TypeOf<typeof THistoryEntry>;

export const THistoryRecord = t.intersection(
  [
    t.interface({
      // ISO8601, like 2020-02-29T18:02:05+00:00
      date: t.string,
      programId: t.string,
      programName: t.string,
      day: t.number,
      dayName: t.string,
      entries: t.array(THistoryEntry),
      startTime: t.number,
      id: t.number,
    }),
    t.partial({
      endTime: t.number,
      ui: TProgressUi,
      timerSince: t.number,
      timerMode: TProgressMode,
    }),
  ],
  "THistoryRecord"
);
export type IHistoryRecord = t.TypeOf<typeof THistoryRecord>;

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
