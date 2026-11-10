import { UserDao, ILimitedUserDao } from "../dao/userDao";
import { IDI } from "./di";
import { PushSync_notify } from "./pushSync";
import { IPartialStorage, IStorage } from "../../src/types";
import { Storage_get, Storage_updateVersions } from "../../src/models/storage";
import { DashboardWebSave_rowWrites, IDashboardWebSaveResult } from "../../src/models/dashboardWebSave";
import { IDashboardApiDetail } from "../../src/models/dashboardApi";
import { IEither } from "../../src/utils/types";

export interface IDashboardStorageWriteError {
  status: number;
  message: string;
  details?: IDashboardApiDetail[];
}

export async function DashboardStorageWrite_load(
  di: IDI,
  currentUser: ILimitedUserDao,
  deviceId: string
): Promise<IEither<{ user: ILimitedUserDao; storage: IStorage }, IDashboardStorageWriteError>> {
  const userDao = new UserDao(di);
  const migration = await userDao.migrateStoredStorage(currentUser, deviceId);
  if (!migration.success) {
    return { success: false, error: { status: 500, message: "Corrupted storage!" } };
  }
  const user = migration.data.user;
  const dashboards = await userDao.getDashboardsByUserId(user.id);
  const storageResult = Storage_get({ ...user.storage, dashboards });
  if (!storageResult.success) {
    di.log.log("Dashboard Save: Error loading old storage", storageResult.error);
    return { success: false, error: { status: 500, message: "Corrupted storage!" } };
  }
  return { success: true, data: { user, storage: storageResult.data } };
}

export async function DashboardStorageWrite_apply(
  di: IDI,
  currentUser: ILimitedUserDao,
  deviceId: string,
  decide: (storage: IStorage) => IDashboardWebSaveResult
): Promise<IEither<{ previous: IStorage; storage: IPartialStorage }, IDashboardStorageWriteError>> {
  const loaded = await DashboardStorageWrite_load(di, currentUser, deviceId);
  if (!loaded.success) {
    return loaded;
  }
  const { user, storage: oldStorage } = loaded.data;
  const decision = decide(oldStorage);
  if (decision.kind === "error") {
    return {
      success: false,
      error: { status: decision.status, message: decision.message, details: decision.details },
    };
  }
  const originalId = Date.now();
  const newStorage: IPartialStorage = {
    ...oldStorage,
    dashboards: decision.dashboards,
    currentDashboardId: decision.currentDashboardId,
    originalId,
  };
  const newVersions = Storage_updateVersions(oldStorage, newStorage, deviceId);
  const writes = DashboardWebSave_rowWrites(oldStorage.dashboards ?? [], decision.dashboards);
  const userDao = new UserDao(di);
  await Promise.all([
    ...writes.toPut.map((dashboard) => userDao.saveDashboard(user.id, dashboard)),
    ...writes.idsToDelete.map((id) => userDao.deleteDashboard(user.id, id)),
  ]);
  const { dashboards: _dashboards, programs: _programs, history: _history, stats: _stats, ...userStorage } = newStorage;
  user.storage = { ...user.storage, ...userStorage, _versions: newVersions };
  await userDao.store(user);
  await PushSync_notify(di, user.id, deviceId, originalId);
  return { success: true, data: { previous: oldStorage, storage: { ...newStorage, _versions: newVersions } } };
}
