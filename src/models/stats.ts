import { IStatsKey } from "../types";

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
}
