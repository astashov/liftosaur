import { IPercentage, ISettings, IStats, IStatsKey, IWeight } from "../types";
import { CollectionUtils_sortBy } from "../utils/collection";
import { ObjectUtils_keys } from "../utils/object";
import { Weight_add, Weight_build, Weight_divide } from "./weight";

export function Stats_name(key: IStatsKey): string {
  switch (key) {
    case "bicepLeft":
      return "Left Bicep";
    case "bicepRight":
      return "Right Bicep";
    case "calfLeft":
      return "Left Calf";
    case "calfRight":
      return "Right Calf";
    case "chest":
      return "Chest";
    case "forearmLeft":
      return "Left Forearm";
    case "forearmRight":
      return "Right Forearm";
    case "hips":
      return "Hips";
    case "neck":
      return "Neck";
    case "shoulders":
      return "Shoulders";
    case "thighLeft":
      return "Left Thigh";
    case "thighRight":
      return "Right Thigh";
    case "waist":
      return "Waist";
    case "weight":
      return "Bodyweight";
    case "bodyfat":
      return "Bodyfat";
  }
}

export function Stats_getCurrentBodyweight(stats: IStats): IWeight | undefined {
  const weights = CollectionUtils_sortBy(stats.weight.weight || [], "timestamp", true);
  return weights[0]?.value;
}

export function Stats_getCurrentMovingAverageBodyweight(stats: IStats, settings: ISettings): IWeight | undefined {
  const movingAverageWindowSize = settings.graphOptions.weight?.movingAverageWindowSize;
  if (!movingAverageWindowSize) {
    return Stats_getCurrentBodyweight(stats);
  }
  const weights = CollectionUtils_sortBy(stats.weight.weight || [], "timestamp", true);
  if (weights.length < movingAverageWindowSize) {
    return Stats_getCurrentBodyweight(stats);
  }
  const recentWeights = weights.slice(0, movingAverageWindowSize);
  const totalWeight = recentWeights.reduce((sum, item) => Weight_add(sum, item.value), Weight_build(0, settings.units));
  return Weight_divide(totalWeight, recentWeights.length);
}

export function Stats_getCurrentBodyfat(stats: IStats): IPercentage | undefined {
  const weights = CollectionUtils_sortBy(stats.percentage.bodyfat || [], "timestamp", true);
  return weights[0]?.value;
}

export function Stats_getEmpty(): IStats {
  return {
    weight: {},
    percentage: {},
    length: {},
  };
}

export function Stats_isEmpty(stats: IStats): boolean {
  const statsKeys: IStatsKey[] = [
    ...ObjectUtils_keys(stats.weight).filter((k) => (stats.weight[k] || []).length > 0),
    ...ObjectUtils_keys(stats.percentage).filter((k) => (stats.percentage[k] || []).length > 0),
    ...ObjectUtils_keys(stats.length).filter((k) => (stats.length[k] || []).length > 0),
  ];
  return statsKeys.length === 0;
}
