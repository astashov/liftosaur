import { TExerciseType } from "./exercise";
import { TSet, ISet } from "./set";
import { Progress, TProgressUi, TProgressMode } from "./progress";
import * as t from "io-ts";
import { CollectionUtils } from "../utils/collection";

export const THistoryEntry = t.type(
  {
    exercise: TExerciseType,
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

import { Weight, IWeight } from "./weight";

export namespace History {
  export function buildFromEntry(entry: IHistoryEntry, day: number): IHistoryRecord {
    return {
      id: 0,
      date: new Date().toISOString(),
      programId: "",
      programName: "",
      day,
      dayName: day.toString(),
      startTime: Date.now(),
      entries: [entry],
    };
  }

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

  export function getMaxSet(entry: IHistoryEntry): ISet | undefined {
    return CollectionUtils.sort(entry.sets, (a, b) => Weight.compare(b.weight, a.weight))[0];
  }

  export function findPersonalRecord(id: number, entry: IHistoryEntry, history: IHistoryRecord[]): ISet | undefined {
    let isMax: boolean | undefined;
    const entryMaxSet = getMaxSet(entry);
    if (entryMaxSet != null && (entryMaxSet.completedReps || 0) > 0) {
      for (const r of history) {
        if (r.id < id) {
          for (const e of r.entries) {
            if (e.exercise.id === entry.exercise.id && e.exercise.bar === entry.exercise.bar) {
              if (isMax == null) {
                isMax = true;
              }
              const maxSet = getMaxSet(e);
              if (maxSet != null && Weight.gte(maxSet.weight, entryMaxSet.weight)) {
                isMax = false;
              }
            }
          }
        }
      }
    } else {
      isMax = false;
    }
    if (isMax == null || isMax === true) {
      return entryMaxSet;
    } else {
      return undefined;
    }
  }

  export function totalEntryWeight(entry: IHistoryEntry): IWeight {
    if (entry.sets.length > 0) {
      const firstSet = entry.sets[0];
      return entry.sets.reduce((memo, set) => Weight.add(memo, set.weight), Weight.build(0, firstSet.weight.unit));
    } else {
      return Weight.build(0, "lb");
    }
  }

  export function totalEntryReps(entry: IHistoryEntry): number {
    return entry.sets.reduce((memo, set) => memo + (set.completedReps || 0), 0);
  }
}
