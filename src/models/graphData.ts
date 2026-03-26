import { CollectionUtils_sort } from "../utils/collection";
import { Weight_convertTo, Weight_build, Weight_getOneRepMax } from "./weight";
import { Length_convertTo } from "./length";
import { Exercise_eq } from "./exercise";
import { Reps_volume } from "./set";
import { History_getMaxWeightSetFromEntry, History_getMax1RMSetFromEntry } from "./history";
import type {
  IHistoryRecord,
  IExerciseType,
  ISettings,
  IStatsWeightValue,
  IStatsLengthValue,
  IStatsPercentageValue,
} from "../types";

export interface IGraphExerciseData {
  data: [number[], (number | null)[], (number | null)[], (number | null)[], (number | null)[], (number | null)[]];
  historyRecords: { [key: number]: IHistoryRecord };
  changeProgramTimes: [number, string][];
}

export function GraphData_exerciseData(
  history: IHistoryRecord[],
  exerciseType: IExerciseType,
  settings: ISettings,
  isWithOneRm?: boolean,
  bodyweightData?: [number, number][]
): IGraphExerciseData {
  const changeProgramTimes: [number, string][] = [];
  let currentProgram: string | undefined = undefined;
  const historyRecords: { [key: number]: IHistoryRecord } = {};
  const normalizedData = CollectionUtils_sort(history, (a, b) => a.startTime - b.startTime).reduce<
    [number, number | null, number | null, number | null, number | null, number | null][]
  >((memo, i) => {
    if (!currentProgram || currentProgram !== i.programName) {
      currentProgram = i.programName;
      changeProgramTimes.push([new Date(Date.parse(i.date)).getTime() / 1000, currentProgram]);
    }
    const entry = i.entries.filter((e) => Exercise_eq(e.exercise, exerciseType))[0];
    if (entry != null) {
      const maxSet = History_getMaxWeightSetFromEntry(entry);
      const maxe1RMSet = History_getMax1RMSetFromEntry(entry);
      const volume = Reps_volume(entry.sets, settings.units);
      if (maxSet != null) {
        const convertedWeight = Weight_convertTo(
          maxSet.completedWeight ?? maxSet.weight ?? Weight_build(0, settings.units),
          settings.units
        );
        let onerm = null;
        if (isWithOneRm) {
          const set = maxe1RMSet || maxSet;
          onerm = Weight_getOneRepMax(
            Weight_convertTo(set.completedWeight ?? set.weight ?? Weight_build(0, settings.units), settings.units),
            set.completedReps || 0,
            set.completedRpe ?? set.rpe ?? 10
          ).value;
        }
        const timestamp = new Date(Date.parse(i.date)).getTime() / 1000;
        historyRecords[timestamp] = i;
        memo.push([
          timestamp,
          Weight_convertTo(convertedWeight, settings.units).value,
          maxSet.completedReps!,
          onerm,
          volume.value,
          null,
        ]);
      }
    }
    return memo;
  }, []);
  const normalizedBodyweightData = (bodyweightData || []).map<
    [number, number | null, number | null, number | null, number | null, number | null]
  >((i) => {
    return [i[0], null, null, null, null, i[1]];
  });
  const sorted = CollectionUtils_sort(
    normalizedData.concat(normalizedBodyweightData),
    (a, b) => (a[0] || 0) - (b[0] || 0)
  );
  const data = sorted.reduce<
    [number[], (number | null)[], (number | null)[], (number | null)[], (number | null)[], (number | null)[]]
  >(
    (memo, i) => {
      memo[0].push(i[0]);
      memo[1].push(i[1]);
      memo[2].push(i[2]);
      memo[3].push(i[3]);
      memo[4].push(i[4]);
      memo[5].push(i[5]);
      return memo;
    },
    [[], [], [], [], [], []]
  );
  return { data, changeProgramTimes, historyRecords };
}

export function GraphData_weightStats(coll: IStatsWeightValue[], settings: ISettings): [number, number][] {
  const sortedCollection = CollectionUtils_sort(coll, (a, b) => a.timestamp - b.timestamp);
  return sortedCollection.map((i) => {
    return [i.timestamp / 1000, Weight_convertTo(i.value, settings.units).value];
  });
}

export function GraphData_lengthStats(coll: IStatsLengthValue[], settings: ISettings): [number, number][] {
  const sortedCollection = CollectionUtils_sort(coll, (a, b) => a.timestamp - b.timestamp);
  return sortedCollection.map((i) => {
    return [i.timestamp / 1000, Length_convertTo(i.value, settings.lengthUnits).value];
  });
}

export function GraphData_percentageStats(coll: IStatsPercentageValue[], _settings: ISettings): [number, number][] {
  const sortedCollection = CollectionUtils_sort(coll, (a, b) => a.timestamp - b.timestamp);
  return sortedCollection.map((i) => {
    return [i.timestamp / 1000, i.value.value];
  });
}

export function GraphData_xRange(
  history: IHistoryRecord[],
  stats: { weight: Record<string, { timestamp: number }[]>; length: Record<string, { timestamp: number }[]> },
  isSameXAxis?: boolean
): { minX: number; maxX: number } {
  let mx = 0;
  let mn = Infinity;
  for (const hr of history) {
    if (mx < hr.startTime) {
      mx = hr.startTime;
    }
    if (mn > hr.startTime) {
      mn = hr.startTime;
    }
  }
  if (isSameXAxis) {
    for (const key of Object.keys(stats.weight)) {
      for (const value of stats.weight[key] || []) {
        if (mn > value.timestamp) {
          mn = value.timestamp;
        }
        if (mx < value.timestamp) {
          mx = value.timestamp;
        }
      }
    }
    for (const key of Object.keys(stats.length)) {
      for (const value of stats.length[key] || []) {
        if (mn > value.timestamp) {
          mn = value.timestamp;
        }
        if (mx < value.timestamp) {
          mx = value.timestamp;
        }
      }
    }
  }
  return { minX: mn, maxX: mx };
}
