import { IStorage, IStats, IHistoryRecord, STORAGE_VERSION_TYPES } from "../types";
import { VersionTrackerUtils_getId } from "../models/versionTracker/utils";
import { ICollectionVersions, IVersionsObject, isCollectionVersions } from "../models/versionTracker/types";

export function WatchStorageFilter_filter(storage: IStorage): unknown {
  const clone = JSON.parse(JSON.stringify(storage)) as Record<string, unknown>;

  const currentProgramId = clone.currentProgramId as string | undefined;
  const programs = (clone.programs as Array<Record<string, unknown>> | undefined) ?? [];

  if (currentProgramId) {
    clone.programs = programs.filter((p) => p.id === currentProgramId);
  }

  clone.history = [];
  clone.stats = { weight: {}, length: {}, percentage: {} };

  const progressArray = clone.progress as Array<Record<string, unknown>> | undefined;
  if (progressArray) {
    clone.progress = progressArray.map(({ ui: _ui, ...rest }) => rest);
  }

  const versions = clone._versions as Record<string, unknown> | undefined;
  if (versions) {
    versions.history = { items: {} };
    versions.stats = { weight: {}, length: {}, percentage: {} };

    const programVersions = versions.programs as Record<string, unknown> | undefined;
    const items = programVersions?.items as Record<string, unknown> | undefined;
    const filteredPrograms = clone.programs as Array<Record<string, unknown>>;
    const currentProgram = filteredPrograms[0];
    const clonedAt = currentProgram?.clonedAt;
    if (programVersions && items && clonedAt != null) {
      const clonedAtKey = `${clonedAt}`;
      const filteredItems: Record<string, unknown> = {};
      if (items[clonedAtKey] != null) {
        filteredItems[clonedAtKey] = items[clonedAtKey];
      }
      programVersions.items = filteredItems;
    }
  }

  return clone;
}

export function WatchStorageFilter_filterJson(storage: IStorage): string {
  return JSON.stringify(WatchStorageFilter_filter(storage));
}

export function WatchStorageFilter_filterForPhone(
  storage: IStorage,
  maxJsonLength: number,
  maxRecords: number
): IStorage {
  const currentProgramId = storage.currentProgramId;
  const programs = currentProgramId ? storage.programs.filter((p) => p.id === currentProgramId) : [];

  const versions = storage._versions ?? {};
  const programVersions = versions.programs;
  const programItems = isCollectionVersions(programVersions) ? programVersions.items : undefined;
  const clonedAt = programs[0]?.clonedAt;
  const admittedProgramItems: NonNullable<ICollectionVersions["items"]> = {};
  const clonedAtItem = programItems != null && clonedAt != null ? programItems[`${clonedAt}`] : undefined;
  if (clonedAt != null && clonedAtItem != null) {
    admittedProgramItems[`${clonedAt}`] = clonedAtItem;
  }

  const historyVersions = versions.history;
  const historyItems = (isCollectionVersions(historyVersions) ? historyVersions.items : undefined) ?? {};

  const emptyStats: IStats = { weight: {}, length: {}, percentage: {} };
  const emptyStatsVersions: IVersionsObject = { weight: {}, length: {}, percentage: {} };

  const base: IStorage = {
    ...storage,
    programs,
    history: [],
    stats: emptyStats,
    _versions: {
      ...versions,
      programs: { items: admittedProgramItems },
      history: { items: {} },
      stats: emptyStatsVersions,
    },
  };

  const admitted: IHistoryRecord[] = [];
  const admittedHistoryItems: NonNullable<ICollectionVersions["items"]> = {};
  let used = JSON.stringify(base).length;

  for (const record of storage.history) {
    if (admitted.length >= maxRecords) {
      break;
    }
    const id = VersionTrackerUtils_getId(record, STORAGE_VERSION_TYPES);
    const item = id != null ? historyItems[id] : undefined;
    const itemSize = id != null && item != null ? JSON.stringify(item).length + id.length + 4 : 0;
    const size = JSON.stringify(record).length + itemSize + 2;
    if (used + size > maxJsonLength) {
      break;
    }
    admitted.push(record);
    used += size;
    if (id != null && item != null) {
      admittedHistoryItems[id] = item;
    }
  }

  return {
    ...base,
    history: admitted,
    _versions: { ...base._versions, history: { items: admittedHistoryItems } },
  };
}

export function WatchStorageFilter_filterForPhoneJson(
  storage: IStorage,
  maxJsonLength: number,
  maxRecords: number
): string {
  return JSON.stringify(WatchStorageFilter_filterForPhone(storage, maxJsonLength, maxRecords));
}
