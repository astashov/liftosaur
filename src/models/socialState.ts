import { IFeedOwner, IFeedResponse, IFeedWorkout, FeedWorkout_key } from "./feedWorkout";
import { IFollowsResponse } from "./follow";
import { IReaction, IReactionSummary, IReactor, Reactions_applyMine } from "./reactions";

export interface ISocialPage {
  keys: string[];
  cursor?: string;
  isLoading: boolean;
  hasMore: boolean;
  failedOwners: string[];
  loadedAt?: number;
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
export const SocialState_pageTtlMs = 60_000;

export function SocialState_isPageStale(page: ISocialPage | undefined, now: number): boolean {
  if (page == null) {
    return true;
  }
  return !page.isLoading && (page.loadedAt == null || now - page.loadedAt > SocialState_pageTtlMs);
}

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
  isFirstPage: boolean,
  now: number = Date.now()
): ISocialState {
  if (response.accountId !== state.accountId) {
    return state;
  }
  const newKeys = response.workouts.map((w) => FeedWorkout_key(w.ownerId, w.recordId));
  const previousPage = state.pages[pageKey];
  const previous = isFirstPage ? [] : (previousPage?.keys ?? []);
  const page: ISocialPage = {
    keys: unionKeys(previous, newKeys),
    cursor: response.cursor,
    isLoading: false,
    hasMore: response.cursor != null,
    failedOwners: response.failedOwners,
    loadedAt: isFirstPage ? now : previousPage?.loadedAt,
  };
  return withFeedResponse(state, pageKey, response, page);
}

export function SocialState_applyFeedRefresh(
  state: ISocialState,
  pageKey: string,
  response: IFeedResponse,
  now: number
): ISocialState {
  const previousPage = state.pages[pageKey];
  if (previousPage == null) {
    return SocialState_applyFeedPage(state, pageKey, response, true, now);
  }
  if (response.accountId !== state.accountId) {
    return state;
  }
  const newKeys = response.workouts.map((w) => FeedWorkout_key(w.ownerId, w.recordId));
  const page: ISocialPage = {
    ...previousPage,
    keys: unionKeys(newKeys, previousPage.keys),
    isLoading: false,
    loadedAt: now,
  };
  return withFeedResponse(state, pageKey, response, page);
}

export function SocialState_startRefresh(state: ISocialState, pageKey: string): ISocialState {
  const page = state.pages[pageKey];
  if (page == null) {
    return state;
  }
  return { ...state, pages: { ...state.pages, [pageKey]: { ...page, isLoading: true } } };
}

function unionKeys(first: string[], second: string[]): string[] {
  const seen = new Set(first);
  return [...first, ...second.filter((k) => !seen.has(k))];
}

function withFeedResponse(
  state: ISocialState,
  pageKey: string,
  response: IFeedResponse,
  page: ISocialPage
): ISocialState {
  const workouts = { ...state.workouts };
  for (const workout of response.workouts) {
    workouts[FeedWorkout_key(workout.ownerId, workout.recordId)] = workout;
  }
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
  requestedIds: number[],
  summaries: Partial<Record<string, IReactionSummary>>
): ISocialState {
  const reactions = { ...state.reactions };
  for (const recordId of requestedIds) {
    const key = FeedWorkout_key(ownerId, recordId);
    const summary = summaries[String(recordId)];
    if (summary != null) {
      reactions[key] = summary;
    } else {
      delete reactions[key];
    }
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
