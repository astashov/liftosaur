import * as v from "valibot";
import { IDashboard, IStorage, VDashboard } from "../types";
import { isCollectionVersions, isFieldVersion } from "./versionTracker/types";
import { FieldRevision_dashboardText, FieldRevision_isStale } from "../utils/fieldRevision";
import { Dashboard_validate } from "./dashboard";
import { DashboardEditorSave_upsert } from "./dashboardEditorSave";

export type IDashboardWebStorage = Pick<IStorage, "dashboards" | "currentDashboardId" | "_versions">;

export type IDashboardWebSaveResult =
  | { kind: "error"; status: 400 | 404 | 409; message: string }
  | { kind: "write"; dashboards: IDashboard[]; currentDashboardId?: string };

export interface IDashboardWebSnapshot {
  name: string;
  text: string;
}

const VSnapshot = v.object({ name: v.string(), text: v.string() });

const STALE_MESSAGE = "This dashboard changed on another device. Reload the page to get the latest version.";

function error(status: 400 | 404 | 409, message: string): IDashboardWebSaveResult {
  return { kind: "error", status, message };
}

function isDeleted(storage: IDashboardWebStorage, id: string): boolean {
  const versions = storage._versions?.dashboards;
  return isCollectionVersions(versions) && versions.deleted?.[id] != null;
}

function validatedWrite(dashboards: IDashboard[], currentDashboardId: string | undefined): IDashboardWebSaveResult {
  const validation = Dashboard_validate(dashboards);
  return validation.success ? { kind: "write", dashboards, currentDashboardId } : error(400, validation.error);
}

function bodyField(body: unknown, key: string): unknown {
  return typeof body === "object" && body != null && key in body ? Object(body)[key] : undefined;
}

export function DashboardWebSave_create(storage: IDashboardWebStorage, body: unknown): IDashboardWebSaveResult {
  const parsed = v.safeParse(VDashboard, bodyField(body, "dashboard"));
  if (!parsed.success) {
    return error(400, "Invalid dashboard");
  }
  const dashboards = storage.dashboards ?? [];
  if (dashboards.some((d) => d.id === parsed.output.id) || isDeleted(storage, parsed.output.id)) {
    return error(409, "A dashboard with this id already exists");
  }
  return validatedWrite([...dashboards, parsed.output], storage.currentDashboardId);
}

export function DashboardWebSave_update(
  storage: IDashboardWebStorage,
  id: string,
  body: unknown
): IDashboardWebSaveResult {
  const parsed = v.safeParse(VSnapshot, bodyField(body, "dashboard"));
  if (!parsed.success) {
    return error(400, "Invalid dashboard");
  }
  const dashboards = storage.dashboards ?? [];
  const existing = dashboards.find((d) => d.id === id);
  if (existing == null) {
    return isDeleted(storage, id) ? error(409, STALE_MESSAGE) : error(404, "Dashboard not found");
  }
  const base = bodyField(body, "base");
  const stored = FieldRevision_dashboardText(storage._versions, id);
  if (FieldRevision_isStale(stored, isFieldVersion(base) ? base : undefined)) {
    return error(409, STALE_MESSAGE);
  }
  const updated: IDashboard = { ...existing, name: parsed.output.name, text: parsed.output.text };
  return validatedWrite(DashboardEditorSave_upsert(dashboards, updated), storage.currentDashboardId);
}

export function DashboardWebSave_select(storage: IDashboardWebStorage, id: string): IDashboardWebSaveResult {
  const dashboards = storage.dashboards ?? [];
  if (!dashboards.some((d) => d.id === id)) {
    return error(404, "Dashboard not found");
  }
  return { kind: "write", dashboards, currentDashboardId: id };
}

export function DashboardWebSave_delete(storage: IDashboardWebStorage, id: string): IDashboardWebSaveResult {
  const dashboards = storage.dashboards ?? [];
  if (!dashboards.some((d) => d.id === id)) {
    return error(404, "Dashboard not found");
  }
  const remaining = dashboards.filter((d) => d.id !== id);
  if (remaining.length === 0) {
    return error(400, "You can't delete your only dashboard");
  }
  const currentDashboardId = storage.currentDashboardId === id ? remaining[0].id : storage.currentDashboardId;
  return { kind: "write", dashboards: remaining, currentDashboardId };
}

export function DashboardWebSave_rowWrites(
  oldDashboards: IDashboard[],
  newDashboards: IDashboard[]
): { toPut: IDashboard[]; idsToDelete: string[] } {
  const toPut = newDashboards.filter((d) => {
    const old = oldDashboards.find((o) => o.id === d.id);
    return old == null || old.name !== d.name || old.text !== d.text;
  });
  const idsToDelete = oldDashboards.filter((o) => !newDashboards.some((d) => d.id === o.id)).map((o) => o.id);
  return { toPut, idsToDelete };
}

export function DashboardWebSave_isDirty(saved: IDashboardWebSnapshot, draft: IDashboardWebSnapshot): boolean {
  return saved.name !== draft.name || saved.text !== draft.text;
}
