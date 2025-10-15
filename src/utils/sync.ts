import { IVersions, VersionTracker } from "../models/versionTracker";
import { ISettings, IStorage, IStatsWeight, IStatsPercentage, IStatsLength, STORAGE_VERSION_TYPES } from "../types";
import { CollectionUtils } from "./collection";
import { ObjectUtils } from "./object";
import { lg } from "./posthog";

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
      let programs = storageDiff.programs;
      const programIds = (storageDiff.programs || []).map((p) => p.id);
      if (programIds.length !== new Set(programIds).size) {
        const duplicatedPrograms = CollectionUtils.compact(
          ObjectUtils.values(
            ObjectUtils.filter(
              CollectionUtils.groupByKey(storageDiff.programs || [], "id"),
              (k, v) => v != null && v.length > 1
            )
          )
        );
        const duplicateInfo = duplicatedPrograms.map((arr) => {
          const isEqual = arr.every((p) => ObjectUtils.isEqual(arr[0], p));
          return { id: arr[0].id, name: arr.map((p) => p.name), isEqual };
        });
        lg("duplicate-programs", { info: JSON.stringify(duplicateInfo) });
        programs = CollectionUtils.compact(duplicatedPrograms.map((arr) => arr[arr.length - 1]));
        storageDiff.programs = programs;
      }
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
