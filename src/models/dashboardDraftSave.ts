import { IFieldVersion } from "./versionTracker/types";
import { DashboardWebSave_isDirty, IDashboardWebSnapshot } from "./dashboardWebSave";

export interface IDashboardDraftSave {
  saved: IDashboardWebSnapshot & { base?: IFieldVersion };
  name: string;
  pending?: IDashboardWebSnapshot;
}

export interface IDashboardDraftSaveRequest {
  snapshot: IDashboardWebSnapshot;
  base?: IFieldVersion;
}

export function DashboardDraftSave_init(snapshot: IDashboardWebSnapshot, base?: IFieldVersion): IDashboardDraftSave {
  return { saved: { ...snapshot, base }, name: snapshot.name };
}

export function DashboardDraftSave_rename(state: IDashboardDraftSave, name: string): IDashboardDraftSave {
  return { ...state, name };
}

export function DashboardDraftSave_isDirty(state: IDashboardDraftSave, text: string): boolean {
  return DashboardWebSave_isDirty(state.saved, { name: state.name, text });
}

export function DashboardDraftSave_isSaving(state: IDashboardDraftSave): boolean {
  return state.pending != null;
}

export function DashboardDraftSave_start(
  state: IDashboardDraftSave,
  text: string
): {
  state: IDashboardDraftSave;
  request?: IDashboardDraftSaveRequest;
} {
  if (DashboardDraftSave_isSaving(state) || !DashboardDraftSave_isDirty(state, text)) {
    return { state };
  }
  const snapshot = { name: state.name, text };
  return {
    state: { ...state, pending: snapshot },
    request: { snapshot, base: state.saved.base },
  };
}

export function DashboardDraftSave_succeeded(state: IDashboardDraftSave, base?: IFieldVersion): IDashboardDraftSave {
  return state.pending != null ? { ...state, saved: { ...state.pending, base }, pending: undefined } : state;
}

export function DashboardDraftSave_failed(state: IDashboardDraftSave): IDashboardDraftSave {
  return { ...state, pending: undefined };
}
