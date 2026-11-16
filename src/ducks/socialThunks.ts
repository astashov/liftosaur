import { lb } from "lens-shmens";
import { IDispatch, IThunk } from "./types";
import { IState, updateState } from "../models/state";
import {
  ISocialState,
  SocialState_applyFeedPage,
  SocialState_applyFeedRefresh,
  SocialState_isPageStale,
  SocialState_feedOwners,
  SocialState_needsProgramEdits,
  SocialState_startRefresh,
  SocialState_applyFollows,
  SocialState_applyOwnReactions,
  SocialState_applyInbound,
  SocialState_startReactionWrite,
  SocialState_settleReactionWrite,
  SocialState_failLoading,
  SocialState_forAccount,
  SocialState_homePage,
  SocialState_invalidatePages,
  SocialState_setHiddenOwners,
  SocialState_startLoading,
  SocialState_applyFriendPrograms,
  SocialState_applyFriendProgram,
  SocialState_applyProgramEdits,
  SocialState_applyProgramEditsFor,
  SocialState_isProgramEditsStale,
  SocialState_hasUnseenEditsFor,
  SocialState_failFriendPrograms,
  SocialState_failFriendProgram,
  SocialState_failProgramEditsFor,
  SocialState_friendProgramKey,
  SocialState_programEditsKey,
  SocialState_startFriendLoad,
} from "../models/socialState";
import { IFollowsResponse, IFollowPermissions } from "../models/follow";
import { FeedWorkout_key } from "../models/feedWorkout";
import { IReaction } from "../models/reactions";
import { IInboundSocial } from "../models/inboundSocial";
import { IEither } from "../utils/types";

const ownReactionsBatch = 50;

function modifySocial(
  dispatch: IDispatch,
  accountId: string | undefined,
  desc: string,
  fn: (social: ISocialState) => ISocialState
): void {
  updateState(
    dispatch,
    [
      lb<IState>().recordModify((state) => {
        if (accountId == null || state.user?.id !== accountId) {
          return state;
        }
        const base = SocialState_forAccount(state.social, accountId);
        return base != null ? { ...state, social: fn(base) } : state;
      }),
    ],
    desc
  );
}

export function SocialThunks_applyInbound(inbound: IInboundSocial, sinceRecordId: number, requestedAt: number): IThunk {
  return async (dispatch) => {
    modifySocial(dispatch, inbound.accountId, "Inbound social", (social) =>
      SocialState_applyInbound(social, inbound, sinceRecordId, requestedAt)
    );
  };
}

function currentSocial(state: IState): ISocialState | undefined {
  return SocialState_forAccount(state.social, state.user?.id);
}

function applyFollowsResult(
  dispatch: IDispatch,
  accountId: string,
  result: IEither<IFollowsResponse, string>,
  invalidate: boolean
): boolean {
  if (!result.success) {
    updateState(dispatch, [lb<IState>().p("toast").record("Something went wrong. Try again.")], "Social error");
    return false;
  }
  modifySocial(dispatch, accountId, "Apply follows", (social) => {
    const withFollows = SocialState_applyFollows(social, result.data);
    return invalidate ? SocialState_invalidatePages(withFollows) : withFollows;
  });
  return true;
}

export function Thunk_loadFollows(): IThunk {
  return async (dispatch, getState, env) => {
    const accountId = getState().user?.id;
    if (accountId == null) {
      return;
    }
    const result = await env.service.getFollows();
    if (result.success) {
      modifySocial(dispatch, accountId, "Load follows", (social) => SocialState_applyFollows(social, result.data));
    }
  };
}

export function Thunk_loadFeed(pageKey: string, isFirstPage: boolean): IThunk {
  return async (dispatch, getState, env) => {
    const accountId = getState().user?.id;
    const social = currentSocial(getState());
    if (accountId == null || social == null) {
      return;
    }
    const page = social.pages[pageKey];
    if (page?.isLoading || (!isFirstPage && page != null && !page.hasMore)) {
      return;
    }
    const owners = SocialState_feedOwners(social, pageKey);
    if (owners != null && owners.length === 0) {
      modifySocial(dispatch, accountId, "Empty feed", (s) =>
        SocialState_applyFeedPage(
          s,
          pageKey,
          { accountId, workouts: [], reactions: {}, owners: {}, failedOwners: [] },
          true
        )
      );
      return;
    }
    modifySocial(dispatch, accountId, "Start feed page", (s) => SocialState_startLoading(s, pageKey, isFirstPage));
    const requestedAt = Date.now();
    const result = await env.service.getFeed({ cursor: isFirstPage ? undefined : page?.cursor, owners });
    if (result.success) {
      modifySocial(dispatch, accountId, "Apply feed page", (s) =>
        SocialState_applyFeedPage(s, pageKey, result.data, isFirstPage, Date.now(), requestedAt)
      );
    } else {
      modifySocial(dispatch, accountId, "Fail feed page", (s) => SocialState_failLoading(s, pageKey));
    }
  };
}

export function Thunk_refreshFeedIfStale(pageKey: string): IThunk {
  return async (dispatch, getState, env) => {
    const accountId = getState().user?.id;
    const cached = currentSocial(getState());
    if (accountId == null || cached == null) {
      return;
    }
    const now = Date.now();
    if (!SocialState_isPageStale(cached.pages[pageKey], now)) {
      return;
    }
    if (pageKey === SocialState_homePage) {
      const followsLoad = dispatch(Thunk_loadFollows());
      if (cached.follows == null) {
        await followsLoad;
      }
    }
    const social = currentSocial(getState()) ?? cached;
    if (pageKey === SocialState_homePage && SocialState_needsProgramEdits(social)) {
      dispatch(Thunk_loadProgramEdits());
    }
    const page = social.pages[pageKey];
    if (page == null) {
      dispatch(Thunk_loadFeed(pageKey, true));
      return;
    }
    const owners = SocialState_feedOwners(social, pageKey);
    if (owners != null && owners.length === 0) {
      return;
    }
    modifySocial(dispatch, accountId, "Start feed refresh", (s) => SocialState_startRefresh(s, pageKey));
    const requestedAt = Date.now();
    const result = await env.service.getFeed({ cursor: undefined, owners });
    if (result.success) {
      modifySocial(dispatch, accountId, "Apply feed refresh", (s) =>
        SocialState_applyFeedRefresh(s, pageKey, result.data, now, requestedAt)
      );
    } else {
      modifySocial(dispatch, accountId, "Fail feed refresh", (s) => SocialState_failLoading(s, pageKey));
    }
  };
}

export function Thunk_loadOwnReactions(recordIds: number[]): IThunk {
  return async (dispatch, getState, env) => {
    const accountId = getState().user?.id;
    if (accountId == null || recordIds.length === 0) {
      return;
    }
    const requestedIds = recordIds.slice(0, ownReactionsBatch);
    const requestedAt = Date.now();
    const result = await env.service.getOwnReactions(requestedIds);
    if (result.success) {
      modifySocial(dispatch, accountId, "Own reactions", (s) =>
        SocialState_applyOwnReactions(s, accountId, requestedIds, result.data, requestedAt)
      );
    }
  };
}

export function Thunk_react(ownerId: string, recordId: number, reaction: IReaction | undefined): IThunk {
  return async (dispatch, getState, env) => {
    const state = getState();
    const accountId = state.user?.id;
    const social = currentSocial(state);
    if (accountId == null || social == null) {
      return;
    }
    const key = FeedWorkout_key(ownerId, recordId);
    const viewer = { userId: accountId, nickname: state.storage.settings.nickname };
    const { seq } = SocialState_startReactionWrite(social, key, viewer, reaction);
    modifySocial(dispatch, accountId, "React", (s) => SocialState_startReactionWrite(s, key, viewer, reaction).state);
    const result = await env.service.setReaction(ownerId, recordId, reaction);
    modifySocial(dispatch, accountId, result.success ? "Reaction saved" : "Undo reaction", (s) =>
      SocialState_settleReactionWrite(s, key, seq, result.success, Date.now())
    );
    if (!result.success) {
      updateState(dispatch, [lb<IState>().p("toast").record("Couldn't save your reaction")], "Reaction error");
    }
  };
}

export function Thunk_approveFollow(requestId: string, permissions: IFollowPermissions, followBack: boolean): IThunk {
  return async (dispatch, getState, env) => {
    const accountId = getState().user?.id;
    if (accountId == null) {
      return;
    }
    applyFollowsResult(dispatch, accountId, await env.service.approveFollow(requestId, permissions, followBack), true);
  };
}

export function Thunk_removeFollowRequest(requestId: string): IThunk {
  return async (dispatch, getState, env) => {
    const accountId = getState().user?.id;
    if (accountId == null) {
      return;
    }
    applyFollowsResult(dispatch, accountId, await env.service.removeFollowRequest(requestId), false);
  };
}

export function Thunk_setFollowerPermissions(userId: string, permissions: IFollowPermissions): IThunk {
  return async (dispatch, getState, env) => {
    const accountId = getState().user?.id;
    if (accountId == null) {
      return;
    }
    applyFollowsResult(dispatch, accountId, await env.service.setFollowerPermissions(userId, permissions), false);
  };
}

export function Thunk_unfollow(userId: string): IThunk {
  return async (dispatch, getState, env) => {
    const accountId = getState().user?.id;
    if (accountId == null) {
      return;
    }
    applyFollowsResult(dispatch, accountId, await env.service.unfollow(userId), true);
  };
}

export function Thunk_removeFollower(userId: string): IThunk {
  return async (dispatch, getState, env) => {
    const accountId = getState().user?.id;
    if (accountId == null) {
      return;
    }
    applyFollowsResult(dispatch, accountId, await env.service.removeFollower(userId), false);
  };
}

export function Thunk_loadFriendPrograms(ownerId: string): IThunk {
  return async (dispatch, getState, env) => {
    const accountId = getState().user?.id;
    if (accountId == null) {
      return;
    }
    modifySocial(dispatch, accountId, "Friend programs loading", (s) => SocialState_startFriendLoad(s, ownerId));
    const result = await env.service.getFriendPrograms(ownerId);
    modifySocial(dispatch, accountId, "Friend programs", (s) =>
      result.success
        ? SocialState_applyFriendPrograms(s, ownerId, result.data.programs)
        : SocialState_failFriendPrograms(s, ownerId, result.error)
    );
  };
}

export function Thunk_loadFriendProgram(ownerId: string, programId: string): IThunk {
  return async (dispatch, getState, env) => {
    const accountId = getState().user?.id;
    if (accountId == null) {
      return;
    }
    modifySocial(dispatch, accountId, "Friend program loading", (s) =>
      SocialState_startFriendLoad(s, SocialState_friendProgramKey(ownerId, programId))
    );
    const result = await env.service.getFriendProgram(ownerId, programId);
    modifySocial(dispatch, accountId, "Friend program", (s) =>
      result.success
        ? SocialState_applyFriendProgram(s, result.data)
        : SocialState_failFriendProgram(s, ownerId, programId, result.error)
    );
  };
}

export function Thunk_loadProgramEdits(force: boolean = false): IThunk {
  return async (dispatch, getState, env) => {
    const accountId = getState().user?.id;
    const now = Date.now();
    if (accountId == null || (!force && !SocialState_isProgramEditsStale(currentSocial(getState()), now))) {
      return;
    }
    const result = await env.service.getProgramEdits();
    if (result.success) {
      modifySocial(dispatch, accountId, "Program edits", (s) => SocialState_applyProgramEdits(s, result.data, now));
    }
  };
}

export function Thunk_loadProgramEditsFor(programId: string): IThunk {
  return async (dispatch, getState, env) => {
    const accountId = getState().user?.id;
    if (accountId == null) {
      return;
    }
    modifySocial(dispatch, accountId, "Program edits loading", (s) =>
      SocialState_startFriendLoad(s, SocialState_programEditsKey(programId))
    );
    const result = await env.service.getProgramEditsFor(programId);
    if (!result.success) {
      modifySocial(dispatch, accountId, "Program edits failed", (s) =>
        SocialState_failProgramEditsFor(s, programId, result.error)
      );
    } else {
      modifySocial(dispatch, accountId, "Program edits for program", (s) =>
        SocialState_applyProgramEditsFor(s, result.data)
      );
      if (SocialState_hasUnseenEditsFor(currentSocial(getState()), programId, result.data.edits)) {
        const seen = await env.service.markProgramEditsSeen(programId);
        if (seen.success) {
          modifySocial(dispatch, accountId, "Program edits seen", (s) =>
            SocialState_applyProgramEdits(s, seen.data, Date.now())
          );
        }
      }
    }
  };
}

export function Thunk_setFeedHiddenOwners(hiddenOwners: string[]): IThunk {
  return async (dispatch, getState) => {
    const accountId = getState().user?.id;
    if (accountId == null) {
      return;
    }
    modifySocial(dispatch, accountId, "Feed filter", (s) => SocialState_setHiddenOwners(s, hiddenOwners));
    dispatch(Thunk_loadFeed(SocialState_homePage, true));
  };
}
