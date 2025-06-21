import { IPercentage, ISettings, IStats, IStatsKey, IWeight } from "../types";
import { CollectionUtils } from "../utils/collection";
import { ObjectUtils } from "../utils/object";
import { Weight } from "./weight";

export namespace Stats {
  export function name(key: IStatsKey): string {
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

  export function getCurrentBodyweight(stats: IStats): IWeight | undefined {
    const weights = CollectionUtils.sortBy(stats.weight.weight || [], "timestamp", true);
    return weights[0]?.value;
  }

  export function getCurrentMovingAverageBodyweight(stats: IStats, settings: ISettings): IWeight | undefined {
    const movingAverageWindowSize = settings.graphOptions.weight?.movingAverageWindowSize;
    if (!movingAverageWindowSize) {
      return getCurrentBodyweight(stats);
    }
    const weights = CollectionUtils.sortBy(stats.weight.weight || [], "timestamp", true);
    if (weights.length < movingAverageWindowSize) {
      return getCurrentBodyweight(stats);
    }
    const recentWeights = weights.slice(0, movingAverageWindowSize);
    const totalWeight = recentWeights.reduce(
      (sum, item) => Weight.add(sum, item.value),
      Weight.build(0, settings.units)
    );
    return Weight.divide(totalWeight, recentWeights.length);
  }

  export function getCurrentBodyfat(stats: IStats): IPercentage | undefined {
    const weights = CollectionUtils.sortBy(stats.percentage.bodyfat || [], "timestamp", true);
    return weights[0]?.value;
  }

  export function getEmpty(): IStats {
    return {
      weight: {},
      percentage: {},
      length: {},
    };
  }

  export function isEmpty(stats: IStats): boolean {
    const statsKeys: IStatsKey[] = [
      ...ObjectUtils.keys(stats.weight).filter((k) => (stats.weight[k] || []).length > 0),
      ...ObjectUtils.keys(stats.percentage).filter((k) => (stats.percentage[k] || []).length > 0),
      ...ObjectUtils.keys(stats.length).filter((k) => (stats.length[k] || []).length > 0),
    ];
    return statsKeys.length === 0;
  }
}
