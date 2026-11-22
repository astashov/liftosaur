import { IExerciseDataValue, ISettings } from "../types";
import { ObjectUtils_keys } from "../utils/object";
import { IFollowPermissions } from "./follow";
import { Settings_build } from "./settings";

export type IFriendFieldAccess = "public" | "private" | keyof IFollowPermissions;
export type IFriendFieldRule<V> = IFriendFieldAccess | ((value: V, permissions: IFollowPermissions) => V);
export type IFriendFieldMap<T> = { [K in keyof T]-?: IFriendFieldRule<T[K]> };

function isAllowed(access: IFriendFieldAccess, permissions: IFollowPermissions): boolean {
  return access === "public" || (access !== "private" && permissions[access]);
}

export function FriendProjection_project<T extends object>(
  value: T,
  hidden: T,
  fields: IFriendFieldMap<T>,
  permissions: IFollowPermissions
): T {
  const result: T = { ...hidden };
  for (const key of ObjectUtils_keys(fields)) {
    const rule: IFriendFieldRule<T[typeof key]> = fields[key];
    if (typeof rule === "function") {
      result[key] = rule(value[key], permissions);
    } else if (isAllowed(rule, permissions)) {
      result[key] = value[key];
    }
  }
  return result;
}

const exerciseDataFields: IFriendFieldMap<IExerciseDataValue> = {
  rm1: "public",
  rounding: "public",
  equipment: "public",
  notes: "notes",
  muscleMultipliers: "public",
  isUnilateral: "public",
  volumeMultiplier: "public",
  warmups: "public",
};

function projectExerciseData(
  data: ISettings["exerciseData"],
  permissions: IFollowPermissions
): ISettings["exerciseData"] {
  const result: ISettings["exerciseData"] = {};
  for (const key of ObjectUtils_keys(data)) {
    const value = data[key];
    if (value != null) {
      result[key] = FriendProjection_project(value, {}, exerciseDataFields, permissions);
    }
  }
  return result;
}

const settingsFields: IFriendFieldMap<ISettings> = {
  timers: "public",
  gyms: "private",
  deletedGyms: "private",
  graphs: "private",
  graphOptions: "private",
  graphsSettings: "private",
  exerciseStatsSettings: "private",
  exercises: "public",
  statsEnabled: "private",
  units: "public",
  lengthUnits: "private",
  volume: "private",
  exerciseData: projectExerciseData,
  planner: "public",
  workoutSettings: "public",
  muscleGroups: "public",
  appleHealthSyncWorkout: "private",
  appleHealthSyncMeasurements: "private",
  appleHealthSyncSleepNutrition: "private",
  appleHealthAnchor: "private",
  googleHealthSyncWorkout: "private",
  googleHealthSyncMeasurements: "private",
  googleHealthSyncSleepNutrition: "private",
  googleHealthAnchor: "private",
  healthConfirmation: "private",
  ignoreDoNotDisturb: "private",
  notifications: "private",
  currentGymId: "private",
  isPublicProfile: "private",
  nickname: "public",
  alwaysOnDisplay: "private",
  vibration: "private",
  startWeekFromMonday: "private",
  rm1formula: "public",
  textSize: "private",
  starredExercises: "private",
  recentExercises: "private",
  theme: "private",
  currentBodyweight: "private",
  affiliateEnabled: "private",
};

export function FriendProjection_settings(settings: ISettings, permissions: IFollowPermissions): ISettings {
  return FriendProjection_project(settings, Settings_build(settings.units), settingsFields, permissions);
}
