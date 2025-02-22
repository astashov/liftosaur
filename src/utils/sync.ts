/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import { ISettings, IStorage, IStatsWeight, IStatsPercentage, IStatsLength } from "../types";
import { CollectionUtils } from "./collection";
import { ObjectUtils } from "./object";

export type IStorageUpdate = Partial<Omit<IStorage, "stats" | "settings" | "originalId" | "version">> & {
  settings: ISettingsUpdate;
  originalId?: IStorage["originalId"];
  version: IStorage["version"];
  stats?: IStatsUpdate;
};

export type ISettingsUpdate = Partial<ISettings>;

export interface ISyncFetchRequest {
  storage: IStorageUpdate;
  userId?: string;
  adminKey?: string;
}

export type IStatsUpdateLength = IStatsLength[keyof IStatsLength] extends (infer A)[] | undefined
  ? (A & { type: "length" })[]
  : never;
export type IStatsUpdateWeight = IStatsWeight[keyof IStatsWeight] extends (infer A)[] | undefined
  ? (A & { type: "weight" })[]
  : never;
export type IStatsUpdatePercentage = IStatsPercentage[keyof IStatsPercentage] extends (infer A)[] | undefined
  ? (A & { type: "percentage" })[]
  : never;
export type IStatsUpdate = Partial<
  Record<keyof IStatsLength, IStatsUpdateLength> &
    Record<keyof IStatsWeight, IStatsUpdateWeight> &
    Record<keyof IStatsPercentage, IStatsUpdatePercentage>
>;

export class Sync {
  public static getStorageUpdate(currentStorage: IStorage, lastStorage: IStorage): IStorageUpdate {
    const settingsUpdate = Sync.getSettingsUpdate(currentStorage.settings, lastStorage.settings);

    const lastHistory = CollectionUtils.groupByKeyUniq(lastStorage.history, "id");
    const currentHistory = CollectionUtils.groupByKeyUniq(currentStorage.history, "id");
    const diffHistory = diffObj({ history: lastHistory }, { history: currentHistory }, "history");
    const historyArr = diffHistory.history
      ? {
          history: CollectionUtils.sortBy(
            CollectionUtils.compact(ObjectUtils.values(diffHistory.history)),
            "startTime"
          ),
        }
      : {};

    const lastPrograms = CollectionUtils.groupByKeyUniq(lastStorage.programs, "id");
    const currentPrograms = CollectionUtils.groupByKeyUniq(currentStorage.programs, "id");
    const diffPrograms = diffObj({ programs: lastPrograms }, { programs: currentPrograms }, "programs");
    const programsArr = diffPrograms.programs
      ? {
          programs: CollectionUtils.sortBy(
            CollectionUtils.compact(ObjectUtils.values(diffPrograms.programs)),
            "clonedAt"
          ),
        }
      : {};

    const weightsArr = diffStats(lastStorage.stats.weight.weight, currentStorage.stats.weight.weight);
    const bodyfatArr = diffStats(lastStorage.stats.percentage.bodyfat, currentStorage.stats.percentage.bodyfat);
    const neckArr = diffStats(lastStorage.stats.length.neck, currentStorage.stats.length.neck);
    const shouldersArr = diffStats(lastStorage.stats.length.shoulders, currentStorage.stats.length.shoulders);
    const bicepLeftArr = diffStats(lastStorage.stats.length.bicepLeft, currentStorage.stats.length.bicepLeft);
    const bicepRightArr = diffStats(lastStorage.stats.length.bicepRight, currentStorage.stats.length.bicepRight);
    const forearmLeftArr = diffStats(lastStorage.stats.length.forearmLeft, currentStorage.stats.length.forearmLeft);
    const forearmRightArr = diffStats(lastStorage.stats.length.forearmRight, currentStorage.stats.length.forearmRight);
    const chestArr = diffStats(lastStorage.stats.length.chest, currentStorage.stats.length.chest);
    const waistArr = diffStats(lastStorage.stats.length.waist, currentStorage.stats.length.waist);
    const hipsArr = diffStats(lastStorage.stats.length.hips, currentStorage.stats.length.hips);
    const thighLeftArr = diffStats(lastStorage.stats.length.thighLeft, currentStorage.stats.length.thighLeft);
    const thighRightArr = diffStats(lastStorage.stats.length.thighRight, currentStorage.stats.length.thighRight);
    const calfLeftArr = diffStats(lastStorage.stats.length.calfLeft, currentStorage.stats.length.calfLeft);
    const calfRightArr = diffStats(lastStorage.stats.length.calfRight, currentStorage.stats.length.calfRight);

    const stats: IStatsUpdate = {
      ...(weightsArr.length > 0 ? { weight: weightsArr.map((r) => ({ ...r, type: "weight" })) } : {}),
      ...(bodyfatArr.length > 0 ? { bodyfat: bodyfatArr.map((r) => ({ ...r, type: "percentage" })) } : {}),
      ...(neckArr.length > 0 ? { neck: neckArr.map((r) => ({ ...r, type: "length" })) } : {}),
      ...(shouldersArr.length > 0 ? { shoulders: shouldersArr.map((r) => ({ ...r, type: "length" })) } : {}),
      ...(bicepLeftArr.length > 0 ? { bicepLeft: bicepLeftArr.map((r) => ({ ...r, type: "length" })) } : {}),
      ...(bicepRightArr.length > 0 ? { bicepRight: bicepRightArr.map((r) => ({ ...r, type: "length" })) } : {}),
      ...(forearmLeftArr.length > 0 ? { forearmLeft: forearmLeftArr.map((r) => ({ ...r, type: "length" })) } : {}),
      ...(forearmRightArr.length > 0 ? { forearmRight: forearmRightArr.map((r) => ({ ...r, type: "length" })) } : {}),
      ...(chestArr.length > 0 ? { chest: chestArr.map((r) => ({ ...r, type: "length" })) } : {}),
      ...(waistArr.length > 0 ? { waist: waistArr.map((r) => ({ ...r, type: "length" })) } : {}),
      ...(hipsArr.length > 0 ? { hips: hipsArr.map((r) => ({ ...r, type: "length" })) } : {}),
      ...(thighLeftArr.length > 0 ? { thighLeft: thighLeftArr.map((r) => ({ ...r, type: "length" })) } : {}),
      ...(thighRightArr.length > 0 ? { thighRight: thighRightArr.map((r) => ({ ...r, type: "length" })) } : {}),
      ...(calfLeftArr.length > 0 ? { calfLeft: calfLeftArr.map((r) => ({ ...r, type: "length" })) } : {}),
      ...(calfRightArr.length > 0 ? { calfRight: calfRightArr.map((r) => ({ ...r, type: "length" })) } : {}),
    };

    const storageUpdate: IStorageUpdate = {
      ...historyArr,
      ...programsArr,
      ...diffArr(lastStorage, currentStorage, "deletedHistory"),
      ...diffArr(lastStorage, currentStorage, "deletedStats"),
      ...diffArr(lastStorage, currentStorage, "deletedPrograms"),
      ...diffVal(lastStorage, currentStorage, "currentProgramId"),
      ...diffVal(lastStorage, currentStorage, "version"),
      ...diffArr(lastStorage, currentStorage, "reviewRequests"),
      ...diffArr(lastStorage, currentStorage, "signupRequests"),
      ...diffArr(lastStorage, currentStorage, "helps"),
      ...diffVal(lastStorage, currentStorage, "tempUserId"),
      ...diffVal(lastStorage, currentStorage, "email"),
      ...diffVal(lastStorage, currentStorage, "affiliates"),
      ...diffVal(lastStorage, currentStorage, "subscription"),
      ...diffVal(lastStorage, currentStorage, "whatsNew"),
      settings: settingsUpdate || {},
      ...(Object.keys(stats).length > 0 ? { stats } : {}),
      originalId: currentStorage.originalId,
      version: currentStorage.version,
    };
    return storageUpdate;
  }

  public static getSettingsUpdate(currentSettings: ISettings, lastSettings: ISettings): ISettingsUpdate {
    const lastGyms = CollectionUtils.groupByKeyUniq(lastSettings.gyms, "id");
    const currentGyms = CollectionUtils.groupByKeyUniq(currentSettings.gyms, "id");
    const gymsDiff = diffObj({ gyms: lastGyms }, { gyms: currentGyms }, "gyms");
    const gymsArr = gymsDiff.gyms
      ? { gyms: CollectionUtils.sortBy(CollectionUtils.compact(ObjectUtils.values(gymsDiff.gyms)), "id") }
      : {};

    const settingsUpdate: ISettingsUpdate = {
      ...diffVal(lastSettings, currentSettings, "timers"),
      ...diffArr(lastSettings, currentSettings, "deletedGyms"),
      ...diffObj(lastSettings, currentSettings, "equipment"),
      ...diffVal(lastSettings, currentSettings, "graphs"),
      ...diffVal(lastSettings, currentSettings, "graphOptions"),
      ...diffVal(lastSettings, currentSettings, "graphsSettings"),
      ...diffVal(lastSettings, currentSettings, "exerciseStatsSettings"),
      ...diffObj(lastSettings, currentSettings, "exercises"),
      ...diffVal(lastSettings, currentSettings, "statsEnabled"),
      ...diffVal(lastSettings, currentSettings, "units"),
      ...diffVal(lastSettings, currentSettings, "lengthUnits"),
      ...diffVal(lastSettings, currentSettings, "volume"),
      ...diffObj(lastSettings, currentSettings, "exerciseData"),
      ...diffVal(lastSettings, currentSettings, "planner"),
      ...diffVal(lastSettings, currentSettings, "currentGymId"),
      ...diffVal(lastSettings, currentSettings, "isPublicProfile"),
      ...diffVal(lastSettings, currentSettings, "nickname"),
      ...diffVal(lastSettings, currentSettings, "alwaysOnDisplay"),
      ...diffVal(lastSettings, currentSettings, "startWeekFromMonday"),
      ...diffVal(lastSettings, currentSettings, "vibration"),
      ...diffVal(lastSettings, currentSettings, "appleHealthAnchor"),
      ...diffVal(lastSettings, currentSettings, "googleHealthAnchor"),
      ...diffVal(lastSettings, currentSettings, "appleHealthSyncMeasurements"),
      ...diffVal(lastSettings, currentSettings, "appleHealthSyncWorkout"),
      ...diffVal(lastSettings, currentSettings, "googleHealthSyncMeasurements"),
      ...diffVal(lastSettings, currentSettings, "googleHealthSyncWorkout"),
      ...gymsArr,
    };
    return settingsUpdate;
  }
}

function diffArr<T, K extends keyof T>(a: T, b: T, key: K): T[K] extends Array<infer U> ? { [P in K]?: U[] } : never {
  const diffItems = CollectionUtils.diff((a[key] || []) as any, (b[key] || []) as any) as any;
  return { ...(diffItems.length > 0 ? { [key]: diffItems } : {}) } as any;
}

function diffObj<T, K extends keyof T>(a: T, b: T, key: K): T[K] extends object ? { [P in K]?: Partial<T[K]> } : never {
  const changedKeys = Object.keys(
    ObjectUtils.changedKeys(a[key] as any, b[key] as any, (c, d) => {
      const result = ObjectUtils.isEqual(c, d);
      return result;
    })
  ) as (keyof T[K])[];
  const obj: any = {};
  for (const k of changedKeys) {
    obj[k] = b[key][k];
  }
  return (ObjectUtils.keys(obj).length > 0 ? { [key]: obj } : {}) as any;
}

function diffVal<T, K extends keyof T>(a: T, b: T, key: K): { [P in K]?: T[K] } {
  return (!ObjectUtils.isEqual(a[key] as any, b[key]) ? { [key]: b[key] } : {}) as any;
}

function diffStats<T extends { timestamp: number }>(lastArr?: T[], currentArr?: T[]): T[] {
  const last = CollectionUtils.groupByKeyUniq(lastArr || [], "timestamp");
  const current = CollectionUtils.groupByKeyUniq(currentArr || [], "timestamp");
  const diff = diffObj({ data: last }, { data: current }, "data");
  return CollectionUtils.compact(ObjectUtils.values(diff.data || {}));
}
