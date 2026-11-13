import { lb } from "lens-shmens";
import { IDispatch, IThunk } from "./types";
import { IState, updateState } from "../models/state";
import {
  ISocialState,
  SocialState_applyFeedPage,
  SocialState_applyFeedRefresh,
  SocialState_isPageStale,
  SocialState_startRefresh,
  SocialState_applyFollows,
  SocialState_applyOwnReactions,
  SocialState_applyReaction,
  SocialState_failLoading,
  SocialState_forAccount,
  SocialState_homePage,
  SocialState_invalidatePages,
  SocialState_restoreReaction,
  SocialState_setHiddenOwners,
  SocialState_startLoading,
} from "../models/socialState";
import { IFollowsResponse, IFollowPermissions } from "../models/follow";
import { FeedWorkout_key } from "../models/feedWorkout";
import { IReaction } from "../models/reactions";
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
      lb<IState>()
        .p("social")
        .recordModify((social) => {
          const base = SocialState_forAccount(social, accountId);
          return base != null ? fn(base) : social;
        }),
    ],
    desc
  );
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

function ownersForPage(social: ISocialState, pageKey: string): string[] | undefined {
  if (pageKey !== SocialState_homePage) {
    return [pageKey];
  }
  if (social.hiddenOwners.length === 0 || social.follows == null) {
    return undefined;
  }
  return social.follows.following.map((f) => f.userId).filter((id) => !social.hiddenOwners.includes(id));
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
    const owners = ownersForPage(social, pageKey);
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
    const result = await env.service.getFeed({ cursor: isFirstPage ? undefined : page?.cursor, owners });
    if (result.success) {
      modifySocial(dispatch, accountId, "Apply feed page", (s) =>
        SocialState_applyFeedPage(s, pageKey, result.data, isFirstPage)
      );
    } else {
      modifySocial(dispatch, accountId, "Fail feed page", (s) => SocialState_failLoading(s, pageKey));
    }
  };
}

export function Thunk_refreshFeedIfStale(pageKey: string): IThunk {
  return async (dispatch, getState, env) => {
    const accountId = getState().user?.id;
    const social = currentSocial(getState());
    if (accountId == null || social == null) {
      return;
    }
    const page = social.pages[pageKey];
    const now = Date.now();
    if (!SocialState_isPageStale(page, now)) {
      return;
    }
    if (pageKey === SocialState_homePage) {
      dispatch(Thunk_loadFollows());
    }
    if (page == null) {
      dispatch(Thunk_loadFeed(pageKey, true));
      return;
    }
    const owners = ownersForPage(social, pageKey);
    if (owners != null && owners.length === 0) {
      return;
    }
    modifySocial(dispatch, accountId, "Start feed refresh", (s) => SocialState_startRefresh(s, pageKey));
    const result = await env.service.getFeed({ cursor: undefined, owners });
    if (result.success) {
      modifySocial(dispatch, accountId, "Apply feed refresh", (s) =>
        SocialState_applyFeedRefresh(s, pageKey, result.data, now)
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
    const result = await env.service.getOwnReactions(requestedIds);
    if (result.success) {
      modifySocial(dispatch, accountId, "Own reactions", (s) =>
        SocialState_applyOwnReactions(s, accountId, requestedIds, result.data)
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
    const previous = social.reactions[key];
    const viewer = { userId: accountId, nickname: state.storage.settings.nickname };
    modifySocial(dispatch, accountId, "React", (s) => SocialState_applyReaction(s, key, viewer, reaction));
    const result = await env.service.setReaction(ownerId, recordId, reaction);
    if (!result.success) {
      modifySocial(dispatch, accountId, "Undo reaction", (s) => SocialState_restoreReaction(s, key, previous));
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
