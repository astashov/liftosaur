import type { INavCommon, IState } from "../models/state";
import { Program_getProgram } from "../models/program";
import type { IScreen } from "../models/screen";
import type { IHistoryRecord } from "../types";
import type { NavigationState } from "@react-navigation/native";

export interface IAdhocRecordParams {
  progressId?: number;
  historyRecordId?: number;
}

export function resolveAdhocRecord(state: IState, params: IAdhocRecordParams | undefined): IHistoryRecord | undefined {
  if (params == null) {
    return undefined;
  }
  if (params.historyRecordId != null) {
    return state.storage.history.find((h) => h.id === params.historyRecordId);
  }
  const { progressId } = params;
  if (progressId == null) {
    return undefined;
  }
  return progressId === 0 ? state.storage.progress?.[0] : state.progress[progressId];
}

export function buildNavCommon(state: IState): INavCommon {
  const currentProgram =
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;
  return {
    loading: state.loading,
    currentProgram,
    settings: state.storage.settings,
    isOngoingProgress: (state.storage.progress?.length ?? 0) > 0,
    stats: state.storage.stats,
    userId: state.user?.id,
  };
}

export function getActiveScreenName(navState: NavigationState | undefined): IScreen | undefined {
  if (!navState) {
    return undefined;
  }
  const activeTab = navState.routes[navState.index ?? 0];
  const tabState = activeTab.state as NavigationState | undefined;
  if (!tabState) {
    return undefined;
  }
  const activeRoute = tabState.routes[tabState.index ?? 0];
  return activeRoute.name as IScreen;
}

export function getActiveStackDepth(navState: NavigationState | undefined): number {
  if (!navState) {
    return 1;
  }
  const activeTab = navState.routes[navState.index ?? 0];
  const tabState = activeTab.state as NavigationState | undefined;
  if (!tabState) {
    return 1;
  }
  return tabState.routes.length;
}
