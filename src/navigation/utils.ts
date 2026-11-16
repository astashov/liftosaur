import type { INavCommon, IState } from "../models/state";
import { Program_getProgram } from "../models/program";
import { untrack } from "./TrackedStateContext";
import type { IScreen } from "../models/screen";
import type { IHistoryRecord } from "../types";
import type { IProgramEditsResponse } from "../models/friendProgram";
import type { NavigationState } from "@react-navigation/native";
import { Subscriptions_isEligibleForThanksgivingPromo } from "../utils/subscriptions";
import {
  ISocialState,
  SocialState_forAccount,
  SocialState_pendingRequestCount,
  SocialState_programEditsFor,
  SocialState_unseenProgramEdits,
} from "../models/socialState";

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

export function trackedSocial(state: IState): ISocialState | undefined {
  // react-tracked re-renders only on the keys a render read. buildNavCommon reads social.programEdits,
  // so without reading every key here, feed and reaction updates would not re-render the screen.
  const social = state.social;
  if (social != null) {
    Object.values(social);
  }
  return SocialState_forAccount(untrack(social), state.user?.id);
}

export function programEditsOfExistingPrograms(state: IState): IProgramEditsResponse | undefined {
  const programIds = (state.storage.programs ?? []).map((p) => p.id);
  return SocialState_programEditsFor(state.social, state.user?.id, programIds);
}

export function buildNavCommon(state: IState): INavCommon {
  const currentProgram =
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;
  const programEdits = programEditsOfExistingPrograms(state);
  return {
    loading: untrack(state.loading),
    currentProgram: untrack(currentProgram),
    settings: untrack(state.storage.settings),
    isOngoingProgress: (state.storage.progress?.length ?? 0) > 0,
    isThanksgivingPromo: Subscriptions_isEligibleForThanksgivingPromo(state),
    stats: untrack(state.storage.stats),
    userId: state.user?.id,
    pendingFollowRequests: SocialState_pendingRequestCount(state.social, state.user?.id),
    unseenProgramEdits: SocialState_unseenProgramEdits(programEdits),
    programEdits: untrack(programEdits),
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
