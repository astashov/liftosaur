import type { INavCommon, IState } from "../models/state";
import { Program_getProgram } from "../models/program";
import { Progress_getCurrentProgress } from "../models/progress";
import type { IScreen } from "../models/screen";
import type { NavigationState } from "@react-navigation/native";

export function buildNavCommon(state: IState): INavCommon {
  const currentProgram =
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;
  return {
    subscription: state.storage.subscription,
    screenStack: state.screenStack,
    doesHaveWorkouts: state.storage.history.length > 0,
    helps: state.storage.helps,
    loading: state.loading,
    currentProgram,
    allPrograms: state.storage.programs,
    settings: state.storage.settings,
    progress: Progress_getCurrentProgress(state),
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
