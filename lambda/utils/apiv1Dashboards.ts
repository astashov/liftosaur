import { UserDao, ILimitedUserDao } from "../dao/userDao";
import { IDI } from "./di";
import { IApiResult, err, ok } from "./apiv1Common";
import {
  DashboardStorageWrite_apply,
  DashboardStorageWrite_load,
  IDashboardStorageWriteError,
} from "./dashboardStorageWrite";
import { UidFactory_generateUid } from "../../src/utils/generator";
import { IDashboardWebStorage } from "../../src/models/dashboardWebSave";
import {
  DashboardApi_create,
  DashboardApi_delete,
  DashboardApi_get,
  DashboardApi_list,
  DashboardApi_resolveId,
  DashboardApi_update,
  IDashboardApiCreateInput,
  IDashboardApiDashboard,
  IDashboardApiSummary,
  IDashboardApiUpdateInput,
} from "../../src/models/dashboardApi";
import { Dashboard_isTextTooLarge, Dashboard_maxTextBytes } from "../../src/models/dashboard";
import { DashboardPreview_summarize, IDashboardPreview } from "../../src/models/dashboardPreview";
import { LiftographEngine_evaluate } from "../../src/liftograph/liftographEngine";

const DASHBOARD_ID_LENGTH = 8;

function codeOf(status: number): string {
  switch (status) {
    case 400:
      return "invalid_input";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 422:
      return "invalid_dashboard";
    default:
      return "internal_error";
  }
}

function writeError<T>(error: IDashboardStorageWriteError): IApiResult<T> {
  return err(error.status, codeOf(error.status), error.message, error.details);
}

function tooLarge<T>(): IApiResult<T> {
  return err(400, "invalid_input", `Dashboard text is larger than ${Dashboard_maxTextBytes / 1024} KB`);
}

function savedDashboard(storage: IDashboardWebStorage, id: string): IApiResult<IDashboardApiDashboard> {
  const result = DashboardApi_get(storage, id);
  return result.success ? ok(result.data) : err(404, "not_found", result.error.message);
}

export async function ApiV1_listDashboards(
  user: ILimitedUserDao,
  deviceId: string,
  di: IDI
): Promise<IApiResult<{ dashboards: IDashboardApiSummary[] }>> {
  const loaded = await DashboardStorageWrite_load(di, user, deviceId);
  return loaded.success ? ok({ dashboards: DashboardApi_list(loaded.data.storage) }) : writeError(loaded.error);
}

export async function ApiV1_getDashboard(
  user: ILimitedUserDao,
  deviceId: string,
  id: string,
  di: IDI
): Promise<IApiResult<IDashboardApiDashboard>> {
  const loaded = await DashboardStorageWrite_load(di, user, deviceId);
  return loaded.success ? savedDashboard(loaded.data.storage, id) : writeError(loaded.error);
}

export async function ApiV1_createDashboard(
  user: ILimitedUserDao,
  deviceId: string,
  input: IDashboardApiCreateInput,
  di: IDI
): Promise<IApiResult<IDashboardApiDashboard>> {
  if (Dashboard_isTextTooLarge(input.text)) {
    return tooLarge();
  }
  const id = UidFactory_generateUid(DASHBOARD_ID_LENGTH);
  const result = await DashboardStorageWrite_apply(di, user, deviceId, (storage) =>
    DashboardApi_create(storage, storage.settings, { id, ...input })
  );
  return result.success ? savedDashboard(result.data.storage, id) : writeError(result.error);
}

export async function ApiV1_updateDashboard(
  user: ILimitedUserDao,
  deviceId: string,
  id: string,
  input: IDashboardApiUpdateInput,
  di: IDI
): Promise<IApiResult<IDashboardApiDashboard>> {
  if (input.text != null && Dashboard_isTextTooLarge(input.text)) {
    return tooLarge();
  }
  const result = await DashboardStorageWrite_apply(di, user, deviceId, (storage) =>
    DashboardApi_update(storage, storage.settings, id, input)
  );
  return result.success ? savedDashboard(result.data.storage, id) : writeError(result.error);
}

export async function ApiV1_deleteDashboard(
  user: ILimitedUserDao,
  deviceId: string,
  id: string,
  di: IDI
): Promise<IApiResult<{ id: string; deleted: true }>> {
  const result = await DashboardStorageWrite_apply(di, user, deviceId, (storage) => DashboardApi_delete(storage, id));
  return result.success
    ? ok({ id: DashboardApi_resolveId(result.data.previous, id) ?? id, deleted: true })
    : writeError(result.error);
}

export async function ApiV1_previewDashboard(
  user: ILimitedUserDao,
  deviceId: string,
  text: string,
  di: IDI
): Promise<IApiResult<IDashboardPreview>> {
  if (Dashboard_isTextTooLarge(text)) {
    return tooLarge();
  }
  const loaded = await DashboardStorageWrite_load(di, user, deviceId);
  if (!loaded.success) {
    return writeError(loaded.error);
  }
  const { settings } = loaded.data.storage;
  const userDao = new UserDao(di);
  const [history, stats] = await Promise.all([
    userDao.getHistoryByUserId(loaded.data.user.id),
    userDao.getStatsByUserId(loaded.data.user.id),
  ]);
  const now = Date.now();
  const result = LiftographEngine_evaluate(text, { history, stats, settings, today: now });
  return ok(DashboardPreview_summarize(text, result, settings, now));
}
