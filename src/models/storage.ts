import { runMigrations } from "../migrations/runner";
import * as v from "valibot";
import { getLatestMigrationVersion } from "../migrations/migrations";
import { UidFactory_generateUid } from "../utils/generator";
import { Settings_build } from "../models/settings";
import { IEither } from "../utils/types";
import RB from "rollbar";
import { IState, updateState } from "./state";
import { lb } from "lens-shmens";
import { IDispatch } from "../ducks/types";
import { ObjectUtils_isEqual, ObjectUtils_values } from "../utils/object";
import { DateUtils_formatYYYYMMDD } from "../utils/date";
import { IStorageUpdate, IStorageUpdate2 } from "../utils/sync";
import { IHistoryRecord, IStorage, IPartialStorage, STORAGE_VERSION_TYPES, VStorage, VHistoryRecord } from "../types";
import {
  CollectionUtils_groupByKeyUniq,
  CollectionUtils_compact,
  CollectionUtils_immutableSort,
} from "../utils/collection";
import { IVersions, VersionTracker } from "./versionTracker";
import { lg } from "../utils/posthog";
import { Diagnostics_getLastActions, Diagnostics_setLastValidationErrors } from "../utils/diagnostics";

declare let Rollbar: RB;

function formatIssuePath(issue: v.GenericIssue): string {
  if (!issue.path || issue.path.length === 0) {
    return "";
  }
  return issue.path
    .map((segment) => {
      const key = (segment as { key: unknown }).key;
      if (typeof key === "number") {
        return `[${key}]`;
      }
      return String(key);
    })
    .reduce((acc, part) => {
      if (part.startsWith("[")) {
        return `${acc}${part}`;
      }
      return acc ? `${acc}.${part}` : part;
    }, "");
}

export function Storage_validate<T>(data: unknown, schema: v.GenericSchema<T>, name: string): IEither<T, string[]> {
  const result = v.safeParse(schema, data, { abortEarly: false });
  if (result.success) {
    // Return the input as T (not result.output) so unknown fields are preserved at every
    // nesting level — valibot's v.object strips unknown keys; io-ts did not, and storage may
    // carry forward-compatible fields we do not want to silently drop. Trade-off: any
    // v.transform / coercion added to schemas in the future will run but be discarded here.
    return { success: true, data: data as T };
  }
  const errors = result.issues.map((issue) => {
    const path = formatIssuePath(issue);
    const head = path ? `${name}.${path}` : name;
    return `${head}: ${issue.message}`;
  });
  return { success: false, error: errors };
}

export function Storage_validateStorage(data: Record<string, unknown>): IEither<IStorage, string[]> {
  const result = Storage_validate(data, VStorage, "storage");
  if (result.success) {
    return { success: true, data: result.data as unknown as IStorage };
  }
  return result;
}

export function Storage_validateAndReportStorage(data: Record<string, unknown>): IEither<IStorage, string[]> {
  const result = Storage_validateAndReport(data, VStorage, "storage");
  if (result.success) {
    return { success: true, data: result.data as unknown as IStorage };
  }
  return result;
}

export function Storage_fillVersions<T extends IPartialStorage | IStorage>(storage: T, deviceId?: string): T {
  const versionTracker = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId });
  const timestamp = Date.now();
  const filledVersions = versionTracker.fillVersions(storage, storage._versions || {}, timestamp);
  return {
    ...storage,
    _versions: filledVersions,
  };
}

export function Storage_validateAndReport<T>(
  data: unknown,
  schema: v.GenericSchema<T>,
  name: string
): IEither<T, string[]> {
  const result = Storage_validate(data, schema, name);
  if (!result.success) {
    const error = result.error;
    lg("ls-corrupted-storage", { lastActions: JSON.stringify(Diagnostics_getLastActions()) });
    Diagnostics_setLastValidationErrors(error);
    if (typeof Rollbar !== "undefined" && Rollbar != null) {
      Rollbar.error(error.join("\n"), { state: JSON.stringify(data), type: name });
    }
    console.error(`Error decoding ${name}`);
    console.log(data);
    error.forEach((e) => console.error(e));
  }
  return result;
}

export function Storage_get(
  maybeStorage?: Record<string, unknown>,
  shouldReportError?: boolean
): IEither<IStorage, string[]> {
  if (maybeStorage) {
    let finalStorage = runMigrations(maybeStorage as IStorage);
    const firstValidateResult = Storage_validate(finalStorage, VStorage, "storage");
    if (!firstValidateResult.success) {
      maybeStorage.version = "20250322014249";
      finalStorage = runMigrations(maybeStorage as IStorage);
    }
    const result = shouldReportError
      ? Storage_validateAndReport(finalStorage, VStorage, "storage")
      : Storage_validate(finalStorage, VStorage, "storage");
    if (result.success) {
      return { success: true, data: result.data as unknown as IStorage };
    }
    return result;
  } else {
    return { success: false, error: ["Provided data is empty"] };
  }
}

export function Storage_getHistoryRecord(
  record: Record<string, unknown>,
  shouldReportError?: boolean
): IEither<IHistoryRecord, string[]> {
  const storage = Storage_getDefault();
  storage.version = "20251230101232";
  storage.history = [record as unknown as IHistoryRecord];
  const migrated = runMigrations(storage);
  const migratedRecord = migrated.history[0];
  if (!migratedRecord) {
    return { success: false, error: ["Failed to migrate history record"] };
  }
  const result = shouldReportError
    ? Storage_validateAndReport(migratedRecord as unknown as Record<string, unknown>, VHistoryRecord, "progress")
    : Storage_validate(migratedRecord as unknown as Record<string, unknown>, VHistoryRecord, "progress");
  if (result.success) {
    return { success: true, data: migratedRecord };
  }
  return { success: false, error: result.error };
}

export function Storage_getDefault(): IStorage {
  const dateNow = Date.now();
  return {
    id: dateNow,
    originalId: dateNow,
    currentProgramId: undefined,
    reviewRequests: [],
    signupRequests: [],
    deletedHistory: [],
    deletedPrograms: [],
    deletedStats: [],
    tempUserId: UidFactory_generateUid(10),
    affiliates: {},
    progress: [],
    stats: {
      weight: { weight: [] },
      length: {
        neck: [],
        shoulders: [],
        bicepLeft: [],
        bicepRight: [],
        forearmLeft: [],
        forearmRight: [],
        chest: [],
        waist: [],
        hips: [],
        thighLeft: [],
        thighRight: [],
        calfLeft: [],
        calfRight: [],
      },
      percentage: { bodyfat: [] },
    },
    settings: Settings_build(),
    history: [],
    version: getLatestMigrationVersion(),
    subscription: { apple: [], google: [] },
    programs: [],
    helps: [],
    email: undefined,
    whatsNew: DateUtils_formatYYYYMMDD(Date.now(), ""),
  };
}

export function Storage_setAffiliate(dispatch: IDispatch, source: string, type: "coupon" | "program"): void {
  updateState(
    dispatch,
    [
      lb<IState>()
        .p("storage")
        .p("affiliates")
        .recordModify((affiliates) => {
          if (affiliates[source] != null) {
            return affiliates;
          }
          return { ...affiliates, [source]: { id: source, timestamp: Date.now(), type, vtype: "affiliate" } };
        }),
    ],
    "Set affiliate"
  );
}

export function Storage_isChanged(aStorage?: IStorage, bStorage?: IStorage): boolean {
  if ((!aStorage && bStorage) || (!bStorage && aStorage)) {
    return true;
  }
  if (!aStorage && !bStorage) {
    return false;
  }
  const { originalId: _aOriginalId, id: _aId, _versions: _aVersions, ...cleanedAStorage } = aStorage!;
  const { originalId: _bOriginalId, id: _bId, _versions: _bVersions, ...cleanedBStorage } = bStorage!;
  const changed = !ObjectUtils_isEqual(cleanedAStorage, cleanedBStorage, ["version"]);
  return changed;
}

export function Storage_isFullStorage(storage: IStorage | IPartialStorage): storage is IStorage {
  return storage.programs != null && storage.history != null && storage.stats != null;
}

export function Storage_partialStorageToStorage(partialStorage: IPartialStorage): IStorage {
  if (partialStorage.history != null && partialStorage.programs != null && partialStorage.stats != null) {
    return partialStorage as IStorage;
  } else {
    return {
      ...partialStorage,
      history: partialStorage.history || [],
      programs: partialStorage.programs || [],
      stats: partialStorage.stats || {
        length: {},
        percentage: {},
        weight: {},
      },
    };
  }
}

export function Storage_updateVersions(
  oldStorage: IPartialStorage,
  newStorage: IPartialStorage,
  deviceId?: string
): IVersions<IStorage> {
  const { id: oldId, originalId: oldOriginalId, _versions: oldVersions, ...oldCleanedStorage } = oldStorage;
  const { id: newId, originalId: newOriginalId, _versions: newVersions, ...newCleanedStorage } = newStorage;
  const versionTracker = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId });
  const timestamp = Date.now();
  if (
    oldCleanedStorage.tempUserId === newCleanedStorage.tempUserId &&
    oldCleanedStorage.version === newCleanedStorage.version
  ) {
    return versionTracker.updateVersions(
      oldCleanedStorage,
      newCleanedStorage,
      oldStorage._versions || {},
      newStorage._versions || {},
      timestamp
    );
  } else {
    return newVersions || {};
  }
}

export function Storage_mergeStorage(oldStorage: IStorage, newStorage: IStorage, deviceId?: string): IStorage {
  const migratedOldStorage = runMigrations(oldStorage);
  const migratedNewStorage = runMigrations(newStorage);
  const { id: oldId, originalId: oldOriginalId, _versions: oldVersions, ...oldCleanedStorage } = migratedOldStorage;
  const { id: newId, originalId: newOriginalId, _versions: newVersions, ...newCleanedStorage } = migratedNewStorage;
  const versionTracker = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId });
  const updatedVersions = versionTracker.mergeVersions(oldVersions || {}, newVersions || {});
  const updatedCleanedStorage = versionTracker.mergeByVersions(
    oldCleanedStorage,
    oldVersions || {},
    newVersions || {},
    newCleanedStorage
  );
  const updatedStorage: IStorage = {
    ...updatedCleanedStorage,
    id: Math.max(newId || Date.now(), oldId || Date.now()),
    originalId: Math.max(newOriginalId ?? 0, oldOriginalId ?? 0),
    _versions: updatedVersions,
  };
  const sortedProgress = sortProgressByIndex(updatedStorage.progress);
  return sortedProgress === updatedStorage.progress ? updatedStorage : { ...updatedStorage, progress: sortedProgress };
}

function sortProgressByIndex(progress: undefined): undefined;
function sortProgressByIndex(progress: IHistoryRecord[]): IHistoryRecord[];
function sortProgressByIndex(progress: IHistoryRecord[] | undefined): IHistoryRecord[] | undefined;
function sortProgressByIndex(progress: IHistoryRecord[] | undefined): IHistoryRecord[] | undefined {
  if (!progress || progress.length === 0) {
    return progress;
  }
  const head = progress[0];
  if (!head.entries || head.entries.length === 0) {
    return progress;
  }

  const byIndex = (a: { index: number }, b: { index: number }): number => a.index - b.index;

  let entriesWithSortedSets = head.entries;
  for (let i = 0; i < head.entries.length; i++) {
    const entry = head.entries[i];
    const sortedSets = CollectionUtils_immutableSort(entry.sets, byIndex);
    if (sortedSets !== entry.sets) {
      if (entriesWithSortedSets === head.entries) {
        entriesWithSortedSets = head.entries.slice();
      }
      entriesWithSortedSets[i] = { ...entry, sets: sortedSets };
    }
  }

  const sortedEntries = CollectionUtils_immutableSort(entriesWithSortedSets, byIndex);
  if (sortedEntries === head.entries) {
    return progress;
  }
  return [{ ...head, entries: sortedEntries }, ...progress.slice(1)];
}

export function Storage_applyStorageUpdate2(storage: IStorage, update: IStorageUpdate2, deviceId?: string): IStorage {
  if (!update.storage || Object.keys(update.storage).length === 0) {
    return storage;
  }

  const versionTracker = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId });
  const currentVersions = storage._versions || {};
  const incomingVersions = update.versions || {};

  const mergedVersions = versionTracker.mergeVersions(currentVersions, incomingVersions);
  const mergedStorage = versionTracker.mergeByVersions(
    storage,
    currentVersions,
    incomingVersions,
    update.storage as Partial<IStorage>
  );

  const updatedStorage: IStorage = {
    ...mergedStorage,
    _versions: mergedVersions,
  };

  const sortedProgress = sortProgressByIndex(updatedStorage.progress);
  return sortedProgress === updatedStorage.progress ? updatedStorage : { ...updatedStorage, progress: sortedProgress };
}

export function Storage_applyUpdate(storage: IPartialStorage, updateWithStats: IStorageUpdate): IPartialStorage {
  const { stats, ...update } = updateWithStats;

  const deletedGyms = new Set([...storage.settings.deletedGyms, ...(update.settings?.deletedGyms || [])]);
  const lastGyms = CollectionUtils_groupByKeyUniq(storage.settings.gyms || [], "id");
  const newGyms = CollectionUtils_groupByKeyUniq(update.settings?.gyms || [], "id");
  const gymsObj = { ...lastGyms, ...newGyms };
  const gymsArr = CollectionUtils_compact(ObjectUtils_values(gymsObj)).filter((g) => !deletedGyms.has(g.id));

  const deletedHistory = Array.from(new Set([...storage.deletedHistory, ...(update.deletedHistory || [])]));
  const deletedPrograms = Array.from(new Set([...storage.deletedPrograms, ...(update.deletedPrograms || [])]));
  const deletedStats = Array.from(new Set([...storage.deletedStats, ...(update.deletedStats || [])]));
  const reviewRequests = Array.from(new Set([...storage.reviewRequests, ...(update.reviewRequests || [])]));
  const signupRequests = Array.from(new Set([...storage.signupRequests, ...(update.signupRequests || [])]));
  const helps = Array.from(new Set([...storage.helps, ...(update.helps || [])]));

  const exercises = { ...storage.settings.exercises, ...(update.settings?.exercises || {}) };
  const exerciseData = { ...storage.settings.exerciseData, ...(update.settings?.exerciseData || {}) };

  const newStorage: IPartialStorage = {
    ...storage,
    ...update,
    deletedHistory,
    deletedPrograms,
    deletedStats,
    reviewRequests,
    signupRequests,
    helps,
    settings: {
      ...storage.settings,
      ...update.settings,
      exercises,
      exerciseData,
      gyms: gymsArr,
    },
  };

  return newStorage;
}
