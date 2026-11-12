import { IFeedOwner, IFeedResponse, IFeedWorkout, FeedWorkout_key } from "./feedWorkout";
import { IFollowsResponse } from "./follow";
import { IReaction, IReactionSummary, IReactor, Reactions_applyMine } from "./reactions";

export interface ISocialPage {
  keys: string[];
  cursor?: string;
  isLoading: boolean;
  hasMore: boolean;
  failedOwners: string[];
}

export interface ISocialState {
  accountId: string;
  follows?: IFollowsResponse;
  workouts: Partial<Record<string, IFeedWorkout>>;
  owners: Partial<Record<string, IFeedOwner>>;
  reactions: Partial<Record<string, IReactionSummary>>;
  pages: Partial<Record<string, ISocialPage>>;
  hiddenOwners: string[];
}

export const SocialState_homePage = "home";

export function SocialState_empty(accountId: string): ISocialState {
  return { accountId, workouts: {}, owners: {}, reactions: {}, pages: {}, hiddenOwners: [] };
}

export function SocialState_forAccount(
  state: ISocialState | undefined,
  accountId: string | undefined
): ISocialState | undefined {
  if (accountId == null) {
    return undefined;
  }
  if (state != null && state.accountId === accountId) {
    return state;
  }
  return SocialState_empty(accountId);
}

export function SocialState_startLoading(state: ISocialState, pageKey: string, isFirstPage: boolean): ISocialState {
  const page = state.pages[pageKey];
  const next: ISocialPage =
    isFirstPage || page == null
      ? { keys: page?.keys ?? [], cursor: undefined, isLoading: true, hasMore: page?.hasMore ?? true, failedOwners: [] }
      : { ...page, isLoading: true };
  return { ...state, pages: { ...state.pages, [pageKey]: next } };
}

export function SocialState_failLoading(state: ISocialState, pageKey: string): ISocialState {
  const page = state.pages[pageKey];
  if (page == null) {
    return state;
  }
  return { ...state, pages: { ...state.pages, [pageKey]: { ...page, isLoading: false } } };
}

export function SocialState_applyFeedPage(
  state: ISocialState,
  pageKey: string,
  response: IFeedResponse,
  isFirstPage: boolean
): ISocialState {
  if (response.accountId !== state.accountId) {
    return state;
  }
  const workouts = { ...state.workouts };
  const newKeys: string[] = [];
  for (const workout of response.workouts) {
    const key = FeedWorkout_key(workout.ownerId, workout.recordId);
    workouts[key] = workout;
    newKeys.push(key);
  }
  const previous = isFirstPage ? [] : (state.pages[pageKey]?.keys ?? []);
  const seen = new Set(previous);
  const keys = [...previous, ...newKeys.filter((k) => !seen.has(k))];
  const page: ISocialPage = {
    keys,
    cursor: response.cursor,
    isLoading: false,
    hasMore: response.cursor != null,
    failedOwners: response.failedOwners,
  };
  return {
    ...state,
    workouts,
    owners: { ...state.owners, ...response.owners },
    reactions: { ...state.reactions, ...response.reactions },
    pages: { ...state.pages, [pageKey]: page },
  };
}

export function SocialState_applyOwnReactions(
  state: ISocialState,
  ownerId: string,
  summaries: Partial<Record<string, IReactionSummary>>
): ISocialState {
  const reactions = { ...state.reactions };
  for (const recordId of Object.keys(summaries)) {
    reactions[FeedWorkout_key(ownerId, Number(recordId))] = summaries[recordId];
  }
  return { ...state, reactions };
}

export function SocialState_applyReaction(
  state: ISocialState,
  key: string,
  viewer: IReactor,
  next: IReaction | undefined
): ISocialState {
  return {
    ...state,
    reactions: { ...state.reactions, [key]: Reactions_applyMine(state.reactions[key], viewer, next) },
  };
}

export function SocialState_restoreReaction(
  state: ISocialState,
  key: string,
  summary: IReactionSummary | undefined
): ISocialState {
  const reactions = { ...state.reactions };
  if (summary == null) {
    delete reactions[key];
  } else {
    reactions[key] = summary;
  }
  return { ...state, reactions };
}

export function SocialState_applyFollows(state: ISocialState, follows: IFollowsResponse): ISocialState {
  if (follows.accountId !== state.accountId) {
    return state;
  }
  return { ...state, follows };
}

export function SocialState_invalidatePages(state: ISocialState): ISocialState {
  return { ...state, pages: {} };
}

export function SocialState_setHiddenOwners(state: ISocialState, hiddenOwners: string[]): ISocialState {
  return { ...state, hiddenOwners, pages: { ...state.pages, [SocialState_homePage]: undefined } };
}
