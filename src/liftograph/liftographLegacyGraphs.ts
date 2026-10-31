import { Exercise_eq, Exercise_getVolumeMultiplier } from "../models/exercise";
import {
  History_collectMuscleGroups,
  History_getMax1RMSetFromEntry,
  History_getMaxWeightSetFromEntry,
} from "../models/history";
import { Length_convertTo } from "../models/length";
import { Reps_volume } from "../models/set";
import { Weight_build, Weight_convertTo, Weight_getOneRepMax, Weight_multiply } from "../models/weight";
import {
  IExerciseType,
  IHistoryRecord,
  IScreenMuscle,
  ISettings,
  IStatsLengthValue,
  IStatsPercentageValue,
  IStatsWeightValue,
} from "../types";
import { CollectionUtils_sort } from "../utils/collection";
import { Collector } from "../utils/collector";

type ILegacyRow = [number, number | null, number | null, number | null, number | null, number | null];

export interface ILegacyExerciseGraphData {
  data: [number[], (number | null)[], (number | null)[], (number | null)[], (number | null)[], (number | null)[]];
  historyRecords: { [key: number]: IHistoryRecord };
  changeProgramTimes: [number, string][];
}

export function Legacy_exerciseData(
  history: IHistoryRecord[],
  exerciseType: IExerciseType,
  settings: ISettings,
  isWithOneRm?: boolean,
  bodyweightData?: [number, number][]
): ILegacyExerciseGraphData {
  const changeProgramTimes: [number, string][] = [];
  let currentProgram: string | undefined = undefined;
  const historyRecords: { [key: number]: IHistoryRecord } = {};
  const normalizedData = CollectionUtils_sort(history, (a, b) => a.startTime - b.startTime).reduce<ILegacyRow[]>(
    (acc, i) => {
      if (!currentProgram || currentProgram !== i.programName) {
        currentProgram = i.programName;
        changeProgramTimes.push([new Date(Date.parse(i.date)).getTime() / 1000, currentProgram]);
      }
      const entry = i.entries.filter((e) => Exercise_eq(e.exercise, exerciseType))[0];
      if (entry != null) {
        const maxSet = History_getMaxWeightSetFromEntry(entry);
        const maxe1RMSet = History_getMax1RMSetFromEntry(entry);
        const volume = Weight_multiply(
          Reps_volume(entry.sets, settings.units),
          Exercise_getVolumeMultiplier(entry.exercise, settings)
        );
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
          acc.push([timestamp, convertedWeight.value, maxSet.completedReps!, onerm, volume.value, null]);
        }
      }
      return acc;
    },
    []
  );
  const normalizedBodyweightData = (bodyweightData || []).map<ILegacyRow>((i) => [i[0], null, null, null, null, i[1]]);
  const sorted = CollectionUtils_sort(normalizedData.concat(normalizedBodyweightData), (a, b) => a[0] - b[0]);
  const data: ILegacyExerciseGraphData["data"] = [[], [], [], [], [], []];
  for (const i of sorted) {
    const lastIdx = data[0].length - 1;
    if (lastIdx >= 0 && data[0][lastIdx] === i[0]) {
      data[1][lastIdx] = data[1][lastIdx] ?? i[1];
      data[2][lastIdx] = data[2][lastIdx] ?? i[2];
      data[3][lastIdx] = data[3][lastIdx] ?? i[3];
      data[4][lastIdx] = data[4][lastIdx] ?? i[4];
      data[5][lastIdx] = data[5][lastIdx] ?? i[5];
      continue;
    }
    data[0].push(i[0]);
    data[1].push(i[1]);
    data[2].push(i[2]);
    data[3].push(i[3]);
    data[4].push(i[4]);
    data[5].push(i[5]);
  }
  return { data, changeProgramTimes, historyRecords };
}

export function Legacy_muscleGroupsData(
  history: IHistoryRecord[],
  settings: ISettings
): Partial<Record<IScreenMuscle | "total", [number[], number[], number[]]>> {
  const sortedHistory = CollectionUtils_sort(history, (a, b) => {
    return new Date(Date.parse(a.date)).getTime() - new Date(Date.parse(b.date)).getTime();
  });
  const [muscleGroupsData] = Collector.build(sortedHistory).addFn(History_collectMuscleGroups(settings)).run();
  return muscleGroupsData;
}

export function Legacy_weightData(coll: IStatsWeightValue[], settings: ISettings): [number, number][] {
  return CollectionUtils_sort(coll, (a, b) => a.timestamp - b.timestamp).map((i) => [
    i.timestamp / 1000,
    Weight_convertTo(i.value, settings.units).value,
  ]);
}

export function Legacy_lengthData(coll: IStatsLengthValue[], settings: ISettings): [number, number][] {
  return CollectionUtils_sort(coll, (a, b) => a.timestamp - b.timestamp).map((i) => [
    i.timestamp / 1000,
    Length_convertTo(i.value, settings.lengthUnits).value,
  ]);
}

export function Legacy_percentageData(coll: IStatsPercentageValue[]): [number, number][] {
  return CollectionUtils_sort(coll, (a, b) => a.timestamp - b.timestamp).map((i) => [
    i.timestamp / 1000,
    i.value.value,
  ]);
}

export function Legacy_statsGraphData(
  collection: [number, number][],
  movingAverageWindowSize?: number
): [number[], number[], number[]] {
  const result: [number[], number[], number[]] = [[], [], []];
  for (let index = 0; index < collection.length; index++) {
    const i = collection[index];
    result[0].push(i[0]);
    result[1].push(i[1]);
    if (movingAverageWindowSize != null) {
      if (index >= movingAverageWindowSize - 1) {
        let sum = 0;
        for (let j = index - movingAverageWindowSize + 1; j <= index; j++) {
          sum += result[1][j];
        }
        result[2].push(Math.round((sum / movingAverageWindowSize) * 10) / 10);
      } else {
        result[2].push(i[1]);
      }
    }
  }
  return result;
}
