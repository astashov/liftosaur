/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import { ISettings, IStorage } from "../types";
import { CollectionUtils } from "./collection";
import { ObjectUtils } from "./object";

export type IStorageUpdate = Partial<Omit<IStorage, "stats" | "settings" | "originalId" | "version">> & {
  settings: ISettingsUpdate;
  originalId: IStorage["originalId"];
  version: IStorage["version"];
};

export type ISettingsUpdate = Partial<ISettings>;

export interface ISyncFetchRequest {
  // stats: [string, string, { updatedAt: number }][];
  storage: IStorageUpdate;
  userId?: string;
  adminKey?: string;
}

export class Sync {
  public static getStorageUpdate(currentStorage: IStorage, lastStorage: IStorage): IStorageUpdate {
    const settingsUpdate = Sync.getSettingsUpdate(lastStorage.settings, currentStorage.settings);

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
      ...diffObj(lastSettings, currentSettings, "equipment"),
      ...diffVal(lastSettings, currentSettings, "graphs"),
      ...diffVal(lastSettings, currentSettings, "graphOptions"),
      ...diffVal(lastSettings, currentSettings, "graphsSettings"),
      ...diffVal(lastSettings, currentSettings, "exerciseStatsSettings"),
      ...diffArr(lastSettings, currentSettings, "deletedExercises"),
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
      ...diffVal(lastSettings, currentSettings, "vibration"),
      ...gymsArr,
    };
    return settingsUpdate;
  }
}

function diffArr<T, K extends keyof T>(a: T, b: T, key: K): T[K] extends Array<infer U> ? { [P in K]?: U[] } : never {
  const diffItems = CollectionUtils.diff(a[key] as any, b[key] as any) as any;
  return { ...(diffItems.length > 0 ? { [key]: diffItems } : {}) } as any;
}

function diffObj<T, K extends keyof T>(a: T, b: T, key: K): T[K] extends object ? { [P in K]?: Partial<T[K]> } : never {
  const changedKeys = Object.keys(
    ObjectUtils.changedKeys(a[key] as any, b[key] as any, (c, d) => {
      const result = ObjectUtils.isEqual(c, d);
      if (!result) {
        console.log(ObjectUtils.diffPaths(c, d), c, d);
      }
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
  return (!ObjectUtils.isEqual(a[key], b[key]) ? { [key]: b[key] } : {}) as any;
}
