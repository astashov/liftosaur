import { ICollectionVersions, IVersions, isCollectionVersions, isFieldVersion } from "../models/versionTracker";
import { VersionTrackerUtils_compareVersions } from "../models/versionTracker/utils";
import { IHistoryRecord, IStorage } from "../types";
import { CollectionUtils_uniqBy } from "./collection";

export interface IHistoryDeltaLocal {
  history: IHistoryRecord[];
  versions: IVersions<IStorage> | undefined;
}

function historyVersions(versions: IVersions<IStorage> | undefined): ICollectionVersions | undefined {
  const history = versions?.history;
  return isCollectionVersions(history) ? history : undefined;
}

function isSameVersion(local: unknown, server: unknown): boolean {
  if (isFieldVersion(local) && isFieldVersion(server)) {
    return VersionTrackerUtils_compareVersions(local, server) === "equal";
  }
  return JSON.stringify(local) === JSON.stringify(server);
}

export function HistoryDelta_missingIds(
  local: IHistoryDeltaLocal,
  serverVersions: IVersions<IStorage> | undefined,
  present: IHistoryRecord[]
): number[] | undefined {
  const server = historyVersions(serverVersions);
  if (server == null) {
    return undefined;
  }
  const localItems = historyVersions(local.versions)?.items || {};
  const localIds = new Set(local.history.map((r) => r.id));
  const presentIds = new Set(present.map((r) => r.id));
  const deleted = server.deleted || {};
  const missing: number[] = [];
  for (const key of Object.keys(server.items || {})) {
    const id = Number(key);
    if (presentIds.has(id) || key in deleted) {
      continue;
    }
    const localVersion = localItems[key];
    if (!localIds.has(id) || localVersion == null || !isSameVersion(localVersion, server.items?.[key])) {
      missing.push(id);
    }
  }
  return missing.sort((a, b) => b - a);
}

export function HistoryDelta_unresolvedIds(requestedIds: number[], fetched: IHistoryRecord[]): number[] {
  const fetchedIds = new Set(fetched.map((r) => r.id));
  return requestedIds.filter((id) => !fetchedIds.has(id));
}

export function HistoryDelta_apply(storage: IStorage, fetched: IHistoryRecord[]): IStorage {
  return { ...storage, history: CollectionUtils_uniqBy([...storage.history, ...fetched], "id") };
}

export function HistoryDelta_sortNewestFirst(history: IHistoryRecord[]): IHistoryRecord[] {
  return [...history].sort((a, b) => b.id - a.id);
}
