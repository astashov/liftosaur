import { ILastSynced } from "../models/state";
import { VersionTracker } from "../models/versionTracker";
import { IStorage, STORAGE_VERSION_TYPES } from "../types";

export const SyncBaseline_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type ISyncBaselineFetchReason = "missing" | "other-user" | "stale";

export type ISyncBaselineSource = Pick<IStorage, "_versions" | "tempUserId">;

export function SyncBaseline_fromServer(serverStorage: ISyncBaselineSource, now: number): ILastSynced {
  return {
    versions: serverStorage._versions,
    tempUserId: serverStorage.tempUserId,
    serverVersionsFetchedAt: now,
  };
}

export function SyncBaseline_afterClean(baseline: ILastSynced, sentStorage: ISyncBaselineSource): ILastSynced {
  return {
    versions: sentStorage._versions,
    tempUserId: sentStorage.tempUserId,
    serverVersionsFetchedAt: baseline.serverVersionsFetchedAt,
  };
}

export function SyncBaseline_withWatchVersions(
  baseline: ILastSynced,
  watchVersions: IStorage["_versions"],
  deviceId: string
): ILastSynced {
  const versionTracker = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId });
  return {
    ...baseline,
    versions: versionTracker.mergeVersions(baseline.versions || {}, watchVersions || {}),
  };
}

export function SyncBaseline_needsFetch(
  baseline: ILastSynced | undefined,
  tempUserId: string,
  now: number
): ISyncBaselineFetchReason | undefined {
  if (baseline == null) {
    return "missing";
  }
  if (baseline.tempUserId !== tempUserId) {
    return "other-user";
  }
  if (now - baseline.serverVersionsFetchedAt >= SyncBaseline_MAX_AGE_MS) {
    return "stale";
  }
  return undefined;
}
