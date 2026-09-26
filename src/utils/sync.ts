import { IVersions, VersionTracker } from "../models/versionTracker";
import { IStorage, STORAGE_VERSION_TYPES } from "../types";
import { CollectionUtils_compact, CollectionUtils_groupByKey } from "./collection";
import { ObjectUtils_values, ObjectUtils_filter, ObjectUtils_isEqual } from "./object";
import { lg } from "./posthog";

export interface IStorageUpdate2 {
  versions?: IVersions<IStorage>;
  storage?: Partial<IStorage>;
  version: IStorage["version"];
  originalId?: IStorage["originalId"];
}

export function Sync_getStorageUpdate2(
  currentStorage: IStorage,
  lastVersions: IStorage["_versions"],
  deviceId: string
): IStorageUpdate2 {
  const versionTracker = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId });
  const versionsDiff = versionTracker.diffVersions(lastVersions, currentStorage._versions || {});
  if (versionsDiff) {
    const storageDiff = versionTracker.extractByVersions(currentStorage, versionsDiff);
    const filledVersionsDiff = versionTracker.fillVersions(storageDiff, versionsDiff, Date.now());
    let programs = storageDiff.programs;
    const programIds = (storageDiff.programs || []).map((p) => p.id);
    if (programIds.length !== new Set(programIds).size) {
      const duplicatedPrograms = CollectionUtils_compact(
        ObjectUtils_values(
          ObjectUtils_filter(
            CollectionUtils_groupByKey(storageDiff.programs || [], "id"),
            (k, v) => v != null && v.length > 1
          )
        )
      );
      const duplicateInfo = duplicatedPrograms.map((arr) => {
        const isEqual = arr.every((p) => ObjectUtils_isEqual(arr[0], p));
        return { id: arr[0].id, name: arr.map((p) => p.name), isEqual };
      });
      lg("duplicate-programs", { info: JSON.stringify(duplicateInfo) });
      programs = CollectionUtils_compact(duplicatedPrograms.map((arr) => arr[arr.length - 1]));
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
