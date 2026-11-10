import { IStorage, ISubscription, STORAGE_VERSION_TYPES } from "../types";
import { CollectionUtils_uniqBy } from "../utils/collection";
import { ObjectUtils_values } from "../utils/object";
import {
  ILoginPhoneIds,
  LoginConflictSummary_fromIds,
  LoginConflictSummary_hasPhoneOnlyData,
  LoginConflictSummary_phoneIds,
} from "./loginConflictSummary";
import { Stats_isEmpty } from "./stats";
import { IVersionValue, VersionTracker, isCollectionVersions, isVersionsObject } from "./versionTracker";
import { VersionTrackerUtils_isRecord, VersionTrackerUtils_isTypedObject } from "./versionTracker/utils";

export type ILoginAdoption = "if-empty" | "never";
export type ILoginPlan = "same-user" | "adopt" | "replace" | "conflict";
export interface ILoginAccount {
  userId: string;
  email: string;
  key?: string;
}

function isFreshAccount(storage: IStorage): boolean {
  const hasHealthStats = ObjectUtils_values(storage.stats.health || {}).some((values) => (values || []).length > 0);
  return (
    storage.history.length === 0 &&
    storage.programs.length === 0 &&
    Stats_isEmpty(storage.stats) &&
    !hasHealthStats &&
    !ObjectUtils_values(storage._versions || {}).some(hasDeleteMarkers)
  );
}

function hasDeleteMarkers(versions: IVersionValue | undefined): boolean {
  if (isCollectionVersions(versions)) {
    return (
      Object.keys(versions.deleted || {}).length > 0 || ObjectUtils_values(versions.items || {}).some(hasDeleteMarkers)
    );
  }
  return isVersionsObject(versions) && ObjectUtils_values(versions).some(hasDeleteMarkers);
}

export function LoginAdoptLocal_plan(args: {
  oldUserId?: string;
  newUserId: string;
  adoption: ILoginAdoption;
  local: IStorage;
  server: IStorage;
}): ILoginPlan {
  return LoginAdoptLocal_planFromIds({ ...args, phone: LoginConflictSummary_phoneIds(args.local) });
}

export function LoginAdoptLocal_planFromIds(args: {
  oldUserId?: string;
  newUserId: string;
  adoption: ILoginAdoption;
  phone: ILoginPhoneIds;
  server: IStorage;
}): ILoginPlan {
  if (args.oldUserId === args.newUserId) {
    return "same-user";
  }
  if (args.adoption === "never") {
    return "replace";
  }
  if (isFreshAccount(args.server)) {
    return "adopt";
  }
  return LoginConflictSummary_hasPhoneOnlyData(LoginConflictSummary_fromIds(args.phone, args.server))
    ? "conflict"
    : "replace";
}

export function LoginAdoptLocal_subscription(local: IStorage, server: IStorage, key?: string): ISubscription {
  return {
    apple: CollectionUtils_uniqBy([...local.subscription.apple, ...server.subscription.apple], "id"),
    google: CollectionUtils_uniqBy([...local.subscription.google, ...server.subscription.google], "id"),
    key,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return VersionTrackerUtils_isRecord(value) && !Array.isArray(value) && !VersionTrackerUtils_isTypedObject(value);
}

function withServerOnlyFields<T extends Record<string, unknown>>(
  local: T,
  server: Record<string, unknown>,
  parentPath?: string
): T {
  const filled: Record<string, unknown> = {};
  for (const key of Object.keys(server)) {
    const path = parentPath ? `${parentPath}.${key}` : key;
    const localValue = local[key];
    const serverValue = server[key];
    if (localValue === undefined) {
      filled[key] = serverValue;
    } else if (
      isPlainObject(localValue) &&
      isPlainObject(serverValue) &&
      !STORAGE_VERSION_TYPES.dictionaryFields.includes(path)
    ) {
      filled[key] = withServerOnlyFields(localValue, serverValue, path);
    }
  }
  return { ...local, ...filled };
}

export function LoginAdoptLocal_storage(
  local: IStorage,
  server: IStorage,
  account: ILoginAccount,
  deviceId: string,
  now: number
): IStorage {
  const adopted: IStorage = {
    ...local,
    tempUserId: account.userId,
    email: account.email,
    subscription: LoginAdoptLocal_subscription(local, server, account.key),
  };
  const { id: _serverId, originalId: _serverOriginalId, _versions: serverVersions, ...serverFields } = server;
  const { id: _localId, originalId: _localOriginalId, _versions: localVersions, ...adoptedFields } = adopted;
  const filledFields = withServerOnlyFields(adoptedFields, serverFields);
  const tracker = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId });
  const versions = tracker.updateVersions(
    { ...serverFields, tempUserId: account.userId },
    filledFields,
    serverVersions || {},
    localVersions || {},
    now
  );
  return { ...adopted, ...filledFields, _versions: versions };
}
