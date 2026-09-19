import { IPartialStorage, IProgram, IStorage } from "../../src/types";
import { ObjectUtils_isEqual } from "../../src/utils/object";
import { isCollectionVersions, isFieldVersion } from "../../src/models/versionTracker/types";
import { VersionTrackerUtils_compareVersions } from "../../src/models/versionTracker/utils";

export interface ISyncMergeNoopArgs {
  storedVersions: IStorage["_versions"];
  mergedVersions: IStorage["_versions"];
  storedRow: Record<string, unknown>;
  mergedRow: Record<string, unknown>;
  incomingHistoryIds: number[];
  loadedHistoryIds: number[];
  incomingPrograms: IProgram[];
  hasIncomingStats: boolean;
  hasIncomingTombstones: boolean;
  storedOriginalId: number | undefined;
}

export interface ISyncMergeCounts {
  noop: boolean;
  historyPuts: number;
  historyPutsEqualVersion: number;
  historyDeletes: number;
  programPuts: number;
  statPuts: number;
  statDeletes: number;
}

export function SyncMergeNoop_row(storage: IPartialStorage): Record<string, unknown> {
  const { history: _h, programs: _p, stats: _s, originalId: _o, _versions: _v, ...row } = storage;
  return row;
}

export function SyncMergeNoop_isNoop(args: ISyncMergeNoopArgs): boolean {
  if (
    args.storedOriginalId == null ||
    args.hasIncomingStats ||
    args.hasIncomingTombstones ||
    args.incomingPrograms.length > 0
  ) {
    return false;
  }
  if (!ObjectUtils_isEqual(args.storedVersions || {}, args.mergedVersions || {})) {
    return false;
  }
  if (!ObjectUtils_isEqual(args.storedRow, args.mergedRow)) {
    return false;
  }
  const loadedHistory = new Set(args.loadedHistoryIds);
  return args.incomingHistoryIds.every((id) => loadedHistory.has(id));
}

export function SyncMergeNoop_hasTombstones(versions: IStorage["_versions"]): boolean {
  if (versions == null) {
    return false;
  }
  return Object.values(versions).some((value) => hasTombstones(value));
}

function hasTombstones(value: unknown): boolean {
  if (isCollectionVersions(value)) {
    return Object.keys(value.deleted || {}).length > 0;
  }
  if (value != null && typeof value === "object" && !isFieldVersion(value)) {
    return Object.values(value as Record<string, unknown>).some((nested) => hasTombstones(nested));
  }
  return false;
}

export function SyncMergeNoop_counts(
  args: ISyncMergeNoopArgs & { noop: boolean; historyDeletes: number; statPuts: number; statDeletes: number }
): ISyncMergeCounts {
  const storedItems = historyItems(args.storedVersions);
  const mergedItems = historyItems(args.mergedVersions);
  const historyPutsEqualVersion = args.incomingHistoryIds.filter((id) => {
    const stored = storedItems[id];
    const merged = mergedItems[id];
    return (
      isFieldVersion(stored) &&
      isFieldVersion(merged) &&
      VersionTrackerUtils_compareVersions(stored, merged) === "equal"
    );
  }).length;
  return {
    noop: args.noop,
    historyPuts: args.noop ? 0 : args.incomingHistoryIds.length,
    historyPutsEqualVersion,
    historyDeletes: args.noop ? 0 : args.historyDeletes,
    programPuts: args.noop ? 0 : args.incomingPrograms.length,
    statPuts: args.noop ? 0 : args.statPuts,
    statDeletes: args.noop ? 0 : args.statDeletes,
  };
}

function historyItems(versions: IStorage["_versions"]): Record<string, unknown> {
  const history = versions?.history;
  return isCollectionVersions(history) ? history.items || {} : {};
}
