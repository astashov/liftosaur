import { IVersions, VersionTracker } from "../models/versionTracker";
import { ISettings, IStorage, IStatsWeight, IStatsPercentage, IStatsLength, STORAGE_VERSION_TYPES } from "../types";

export type IStorageUpdate = Partial<Omit<IStorage, "stats" | "settings" | "originalId" | "version">> & {
  settings: ISettingsUpdate;
  originalId?: IStorage["originalId"];
  version: IStorage["version"];
  stats?: IStatsUpdate;
  _versions?: IStorage["_versions"];
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

export interface IStorageUpdate2 {
  versions?: IVersions<IStorage>;
  storage?: Partial<IStorage>;
  version: IStorage["version"];
  originalId?: IStorage["originalId"];
}

export class Sync {
  public static getStorageUpdate2(currentStorage: IStorage, lastStorage: IStorage, deviceId?: string): IStorageUpdate2 {
    const versionTracker = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId });
    const versionsDiff = versionTracker.diffVersions(lastStorage._versions, currentStorage._versions || {});
    if (versionsDiff) {
      const storageDiff = versionTracker.extractByVersions(currentStorage, versionsDiff);
      const filledVersionsDiff = versionTracker.fillVersions(storageDiff, versionsDiff, Date.now());

      return {
        version: currentStorage.version,
        originalId: currentStorage.originalId,
        versions: filledVersionsDiff,
        storage: storageDiff,
      };
    } else {
      return {
        version: currentStorage.version,
        originalId: currentStorage.originalId,
      };
    }
  }
}
