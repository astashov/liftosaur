import { Dashboard_seedId, Dashboard_validate } from "./dashboard";
import { IDashboard, IStorage } from "../types";
import type { ILiftographDashboardDocument } from "../liftograph/liftographDashboard";

export interface IDashboardEditorSession {
  dashboardId: string;
  baseText: string;
  origin: "persisted" | "fallback";
}

export type IDashboardEditorSaveDecision =
  | { kind: "close" }
  | { kind: "alert"; message: string }
  | { kind: "askSaveAsNew" }
  | { kind: "write"; dashboard: IDashboard; currentDashboardId?: string };

export function DashboardEditorSave_session(document: ILiftographDashboardDocument): IDashboardEditorSession {
  return { dashboardId: document.dashboardId, baseText: document.text, origin: document.origin };
}

export function DashboardEditorSave_isDirty(session: IDashboardEditorSession, text: string): boolean {
  return text !== session.baseText;
}

export function DashboardEditorSave_upsert(dashboards: IDashboard[] | undefined, dashboard: IDashboard): IDashboard[] {
  const list = dashboards ?? [];
  return list.some((d) => d.id === dashboard.id)
    ? list.map((d) => (d.id === dashboard.id ? dashboard : d))
    : [...list, dashboard];
}

function validatedWrite(
  dashboards: IDashboard[] | undefined,
  dashboard: IDashboard,
  currentDashboardId?: string
): IDashboardEditorSaveDecision {
  const validation = Dashboard_validate(DashboardEditorSave_upsert(dashboards, dashboard));
  return validation.success
    ? { kind: "write", dashboard, currentDashboardId }
    : { kind: "alert", message: validation.error };
}

export function DashboardEditorSave_decide(
  storage: Pick<IStorage, "dashboards" | "currentDashboardId">,
  session: IDashboardEditorSession,
  text: string
): IDashboardEditorSaveDecision {
  if (!DashboardEditorSave_isDirty(session, text)) {
    return { kind: "close" };
  }
  const dashboards = storage.dashboards ?? [];
  const existing = dashboards.find((d) => d.id === session.dashboardId);
  if (existing != null) {
    return validatedWrite(dashboards, { ...existing, text });
  }
  if (session.origin === "fallback" && dashboards.length === 0) {
    const seed: IDashboard = { vtype: "dashboard", id: Dashboard_seedId, name: "Graphs", text };
    return validatedWrite(dashboards, seed, seed.id);
  }
  return { kind: "askSaveAsNew" };
}

export function DashboardEditorSave_confirmAsNew(
  storage: Pick<IStorage, "dashboards">,
  text: string,
  newId: string
): IDashboardEditorSaveDecision {
  return validatedWrite(storage.dashboards, { vtype: "dashboard", id: newId, name: "Graphs", text }, newId);
}
