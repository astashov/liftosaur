import type { INavCommon, IState } from "../models/state";
import { Program_getProgram } from "../models/program";
import type { IScreen } from "../models/screen";
import type { NavigationState } from "@react-navigation/native";

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
