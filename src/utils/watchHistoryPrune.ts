import { IStorage, STORAGE_VERSION_TYPES } from "../types";
import { VersionTrackerUtils_getId } from "../models/versionTracker/utils";
import { ICollectionVersions, isCollectionVersions } from "../models/versionTracker/types";

export function WatchHistoryPrune_prune(storage: IStorage, confirmedIds: Set<string>): IStorage {
  const kept = storage.history.filter((record, index) => {
    if (index === 0) {
      return true;
    }
    const id = VersionTrackerUtils_getId(record, STORAGE_VERSION_TYPES);
    return id == null || !confirmedIds.has(id);
  });
  if (kept.length === storage.history.length) {
    return storage;
  }

  const keptIds = new Set<string>();
  for (const record of kept) {
    const id = VersionTrackerUtils_getId(record, STORAGE_VERSION_TYPES);
    if (id != null) {
      keptIds.add(id);
    }
  }

  const versions = storage._versions ?? {};
  const historyVersions = versions.history;
  if (!isCollectionVersions(historyVersions)) {
    return { ...storage, history: kept };
  }

  const keptItems: NonNullable<ICollectionVersions["items"]> = {};
  for (const id of Object.keys(historyVersions.items ?? {})) {
    if (keptIds.has(id)) {
      keptItems[id] = (historyVersions.items ?? {})[id];
    }
  }

  return {
    ...storage,
    history: kept,
    _versions: { ...versions, history: { ...historyVersions, items: keptItems } },
  };
}
