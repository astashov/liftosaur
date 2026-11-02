import { IFieldVersion } from "./versionTracker/types";
import { DashboardWebSave_isDirty, IDashboardWebSnapshot } from "./dashboardWebSave";

export interface IDashboardDraftSave {
  saved: IDashboardWebSnapshot & { base?: IFieldVersion };
  draft: IDashboardWebSnapshot;
  pending?: IDashboardWebSnapshot;
}

export interface IDashboardDraftSaveRequest {
  snapshot: IDashboardWebSnapshot;
  base?: IFieldVersion;
}

export function DashboardDraftSave_init(snapshot: IDashboardWebSnapshot, base?: IFieldVersion): IDashboardDraftSave {
  return { saved: { ...snapshot, base }, draft: snapshot };
}

export function DashboardDraftSave_edit(
  state: IDashboardDraftSave,
  change: Partial<IDashboardWebSnapshot>
): IDashboardDraftSave {
  return { ...state, draft: { ...state.draft, ...change } };
}

export function DashboardDraftSave_isDirty(state: IDashboardDraftSave): boolean {
  return DashboardWebSave_isDirty(state.saved, state.draft);
}

export function DashboardDraftSave_isSaving(state: IDashboardDraftSave): boolean {
  return state.pending != null;
}

export function DashboardDraftSave_start(state: IDashboardDraftSave): {
  state: IDashboardDraftSave;
  request?: IDashboardDraftSaveRequest;
} {
  if (DashboardDraftSave_isSaving(state) || !DashboardDraftSave_isDirty(state)) {
    return { state };
  }
  return {
    state: { ...state, pending: state.draft },
    request: { snapshot: state.draft, base: state.saved.base },
  };
}

export function DashboardDraftSave_succeeded(state: IDashboardDraftSave, base?: IFieldVersion): IDashboardDraftSave {
  return state.pending != null ? { ...state, saved: { ...state.pending, base }, pending: undefined } : state;
}

export function DashboardDraftSave_failed(state: IDashboardDraftSave): IDashboardDraftSave {
  return { ...state, pending: undefined };
}
