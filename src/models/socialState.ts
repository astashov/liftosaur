import { IFeedOwner, IFeedResponse, IFeedWorkout, FeedWorkout_key, FeedWorkout_parseKey } from "./feedWorkout";
import { Follow_displayName, IFollowsResponse } from "./follow";
import { IReaction, IReactionSummary, IReactor, Reactions_applyMine } from "./reactions";
import {
  IFriendProgramContext,
  IFriendProgramSummary,
  IProgramEdit,
  IProgramEditsForProgram,
  IProgramEditsResponse,
} from "./friendProgram";
import { RelativeTime_ago } from "../utils/relativeTime";
import { ObjectUtils_filter } from "../utils/object";
import { IInboundSocial } from "./inboundSocial";

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
  friendPrograms: Partial<Record<string, IFriendProgramSummary[]>>;
  friendProgram: Partial<Record<string, IFriendProgramContext>>;
  friendErrors: Partial<Record<string, string>>;
  programEdits?: IProgramEditsResponse & { loadedAt: number };
  programEditsByProgram: Partial<Record<string, IProgramEdit[]>>;
  programEditsRequestedAt?: number;
  reactionReadAt?: Partial<Record<string, number>>;
  reactionWrites?: Partial<Record<string, IReactionWrite>>;
  reactionWriteCounter?: number;
}

export interface IReactionWrite {
  seq: number;
  reaction: IReaction | undefined;
  viewer: IReactor;
  previous: IReactionSummary | undefined;
  settledAt?: number;
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
  return {
    accountId,
    workouts: {},
    owners: {},
    reactions: {},
    pages: {},
    hiddenOwners: [],
    friendPrograms: {},
    friendProgram: {},
    friendErrors: {},
    programEditsByProgram: {},
  };
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

export function SocialState_pendingRequestCount(
  state: ISocialState | undefined,
  accountId: string | undefined
): number {
  return state != null && state.accountId === accountId ? (state.follows?.incoming.length ?? 0) : 0;
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
  now: number = Date.now(),
  requestedAt: number = now
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
  return withFeedResponse(state, pageKey, response, page, requestedAt);
}

export function SocialState_applyFeedRefresh(
  state: ISocialState,
  pageKey: string,
  response: IFeedResponse,
  now: number,
  requestedAt: number = now
): ISocialState {
  const previousPage = state.pages[pageKey];
  if (previousPage == null) {
    return SocialState_applyFeedPage(state, pageKey, response, true, now, requestedAt);
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
  return withFeedResponse(state, pageKey, response, page, requestedAt);
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
  page: ISocialPage,
  requestedAt: number
): ISocialState {
  const workouts = { ...state.workouts };
  for (const workout of response.workouts) {
    workouts[FeedWorkout_key(workout.ownerId, workout.recordId)] = workout;
  }
  const covered = response.workouts.map((w) => FeedWorkout_key(w.ownerId, w.recordId));
  return {
    ...applyReactionSnapshot(state, covered, response.reactions, requestedAt),
    workouts,
    owners: { ...state.owners, ...response.owners },
    pages: { ...state.pages, [pageKey]: page },
  };
}

function applyReactionSnapshot(
  state: ISocialState,
  coveredKeys: string[],
  incoming: Partial<Record<string, IReactionSummary>>,
  requestedAt: number
): ISocialState {
  const reactions = { ...state.reactions };
  const readAt = { ...state.reactionReadAt };
  const writes = { ...state.reactionWrites };
  for (const key of coveredKeys) {
    const lastReadAt = readAt[key];
    if (lastReadAt != null && requestedAt < lastReadAt) {
      continue;
    }
    readAt[key] = requestedAt;
    const summary = incoming[key];
    if (summary != null) {
      reactions[key] = summary;
    } else {
      delete reactions[key];
    }
    const settledAt = writes[key]?.settledAt;
    if (settledAt != null && requestedAt > settledAt) {
      delete writes[key];
    }
  }
  for (const key of Object.keys(writes)) {
    const write = writes[key];
    if (write != null) {
      reactions[key] = Reactions_applyMine(reactions[key], write.viewer, write.reaction);
    }
  }
  return { ...state, reactions, reactionReadAt: readAt, reactionWrites: writes };
}

function ownReactionSnapshot(
  state: ISocialState,
  belongs: (recordId: number) => boolean,
  summaries: Partial<Record<string, IReactionSummary>>,
  extraRecordIds: number[],
  requestedAt: number
): ISocialState {
  const covered = new Set<string>();
  const incoming: Partial<Record<string, IReactionSummary>> = {};
  for (const key of Object.keys(state.reactions)) {
    const parsed = FeedWorkout_parseKey(key);
    if (parsed != null && parsed.ownerId === state.accountId && belongs(parsed.recordId)) {
      covered.add(key);
    }
  }
  for (const recordId of [...extraRecordIds, ...Object.keys(summaries).map(Number)]) {
    if (belongs(recordId)) {
      covered.add(FeedWorkout_key(state.accountId, recordId));
    }
  }
  for (const recordId of Object.keys(summaries)) {
    const summary = summaries[recordId];
    if (summary != null && summary.total > 0) {
      incoming[FeedWorkout_key(state.accountId, Number(recordId))] = summary;
    }
  }
  return applyReactionSnapshot(state, Array.from(covered), incoming, requestedAt);
}

function isOlder(requestedAt: number, lastAppliedAt: number | undefined): boolean {
  return lastAppliedAt != null && requestedAt < lastAppliedAt;
}

export function SocialState_applyOwnReactions(
  state: ISocialState,
  ownerId: string,
  requestedIds: number[],
  summaries: Partial<Record<string, IReactionSummary>>,
  requestedAt: number = Date.now()
): ISocialState {
  if (ownerId !== state.accountId) {
    return state;
  }
  const requested = new Set(requestedIds);
  return ownReactionSnapshot(state, (recordId) => requested.has(recordId), summaries, requestedIds, requestedAt);
}

export function SocialState_applyInbound(
  state: ISocialState,
  inbound: IInboundSocial,
  sinceRecordId: number,
  requestedAt: number
): ISocialState {
  if (inbound.accountId !== state.accountId) {
    return state;
  }
  const withReactions = ownReactionSnapshot(
    state,
    (recordId) => recordId >= sinceRecordId,
    inbound.reactions,
    [],
    requestedAt
  );
  return inbound.programEdits != null
    ? SocialState_applyProgramEdits(withReactions, inbound.programEdits, requestedAt, requestedAt)
    : withReactions;
}

export function SocialState_startReactionWrite(
  state: ISocialState,
  key: string,
  viewer: IReactor,
  reaction: IReaction | undefined
): { state: ISocialState; seq: number } {
  const writes = state.reactionWrites ?? {};
  const seq = (state.reactionWriteCounter ?? 0) + 1;
  const pending = writes[key];
  const previous = pending != null && pending.settledAt == null ? pending.previous : state.reactions[key];
  return {
    seq,
    state: {
      ...state,
      reactions: { ...state.reactions, [key]: Reactions_applyMine(state.reactions[key], viewer, reaction) },
      reactionWrites: { ...writes, [key]: { seq, reaction, viewer, previous } },
      reactionWriteCounter: seq,
    },
  };
}

export function SocialState_settleReactionWrite(
  state: ISocialState,
  key: string,
  seq: number,
  isSaved: boolean,
  now: number
): ISocialState {
  const writes = state.reactionWrites ?? {};
  const write = writes[key];
  if (write == null || write.seq !== seq) {
    return state;
  }
  if (isSaved) {
    return { ...state, reactionWrites: { ...writes, [key]: { ...write, settledAt: now } } };
  }
  const reactions = { ...state.reactions };
  if (write.previous == null) {
    delete reactions[key];
  } else {
    reactions[key] = write.previous;
  }
  const nextWrites = { ...writes };
  delete nextWrites[key];
  return { ...state, reactions, reactionWrites: nextWrites };
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
  const sharing = new Set(follows.following.filter((f) => f.permissions.programs).map((f) => f.userId));
  return {
    ...state,
    follows,
    friendPrograms: ObjectUtils_filter(state.friendPrograms, (ownerId) => sharing.has(ownerId)),
    friendProgram: ObjectUtils_filter(
      state.friendProgram,
      (_, context) => context != null && sharing.has(context.ownerId)
    ),
  };
}

export function SocialState_invalidatePages(state: ISocialState): ISocialState {
  return { ...state, pages: {} };
}

export function SocialState_feedOwners(state: ISocialState, pageKey: string): string[] | undefined {
  if (pageKey !== SocialState_homePage) {
    return [pageKey];
  }
  if (state.follows == null) {
    return undefined;
  }
  const following = state.follows.following.map((f) => f.userId);
  if (following.length === 0) {
    return [];
  }
  return state.hiddenOwners.length === 0 ? undefined : following.filter((id) => !state.hiddenOwners.includes(id));
}

export function SocialState_needsProgramEdits(state: ISocialState): boolean {
  return state.follows == null || state.follows.followers.length > 0;
}

export function SocialState_setHiddenOwners(state: ISocialState, hiddenOwners: string[]): ISocialState {
  return { ...state, hiddenOwners, pages: { ...state.pages, [SocialState_homePage]: undefined } };
}

export function SocialState_friendProgramKey(ownerId: string, programId: string): string {
  return `${ownerId}:${programId}`;
}

export function SocialState_applyFriendPrograms(
  state: ISocialState,
  ownerId: string,
  programs: IFriendProgramSummary[]
): ISocialState {
  return {
    ...state,
    friendPrograms: { ...state.friendPrograms, [ownerId]: programs },
    friendErrors: { ...state.friendErrors, [ownerId]: undefined },
  };
}

export function SocialState_applyFriendProgram(state: ISocialState, context: IFriendProgramContext): ISocialState {
  const key = SocialState_friendProgramKey(context.ownerId, context.exported.program.id);
  return {
    ...state,
    friendProgram: { ...state.friendProgram, [key]: context },
    friendErrors: { ...state.friendErrors, [key]: undefined },
  };
}

const connectionMessage = "Couldn't load. Check your connection and try again.";

function friendLoadMessage(error: string): string {
  return error === "network" ? connectionMessage : "Couldn't load. It may not be shared with you anymore.";
}

export function SocialState_programEditsKey(programId: string): string {
  return `edits:${programId}`;
}

export function SocialState_startFriendLoad(state: ISocialState, key: string): ISocialState {
  return state.friendErrors[key] == null
    ? state
    : { ...state, friendErrors: { ...state.friendErrors, [key]: undefined } };
}

export function SocialState_failProgramEditsFor(state: ISocialState, programId: string, error: string): ISocialState {
  const message = error === "network" ? connectionMessage : "Couldn't load the changes. Try again.";
  return { ...state, friendErrors: { ...state.friendErrors, [SocialState_programEditsKey(programId)]: message } };
}

export function SocialState_failFriendPrograms(state: ISocialState, ownerId: string, error: string): ISocialState {
  return {
    ...state,
    friendPrograms: { ...state.friendPrograms, [ownerId]: undefined },
    friendErrors: { ...state.friendErrors, [ownerId]: friendLoadMessage(error) },
  };
}

export function SocialState_failFriendProgram(
  state: ISocialState,
  ownerId: string,
  programId: string,
  error: string
): ISocialState {
  const key = SocialState_friendProgramKey(ownerId, programId);
  return {
    ...state,
    friendProgram: { ...state.friendProgram, [key]: undefined },
    friendErrors: { ...state.friendErrors, [key]: friendLoadMessage(error) },
  };
}

export function SocialState_applyProgramEdits(
  state: ISocialState,
  response: IProgramEditsResponse,
  now: number,
  requestedAt: number = now
): ISocialState {
  if (response.accountId !== state.accountId || isOlder(requestedAt, state.programEditsRequestedAt)) {
    return state;
  }
  return { ...state, programEdits: { ...response, loadedAt: now }, programEditsRequestedAt: requestedAt };
}

export function SocialState_applyProgramEditsFor(state: ISocialState, response: IProgramEditsForProgram): ISocialState {
  if (response.accountId !== state.accountId) {
    return state;
  }
  return {
    ...state,
    programEditsByProgram: { ...state.programEditsByProgram, [response.programId]: response.edits },
    friendErrors: { ...state.friendErrors, [SocialState_programEditsKey(response.programId)]: undefined },
  };
}

export function SocialState_isProgramEditsStale(state: ISocialState | undefined, now: number): boolean {
  const loadedAt = state?.programEdits?.loadedAt;
  return loadedAt == null || now - loadedAt > SocialState_pageTtlMs;
}

export function SocialState_programEditsFor(
  state: ISocialState | undefined,
  accountId: string | undefined,
  programIds: string[]
): IProgramEditsResponse | undefined {
  const programEdits = state != null && state.accountId === accountId ? state.programEdits : undefined;
  if (programEdits == null) {
    return undefined;
  }
  const existing = new Set(programIds);
  const programs = programEdits.programs.filter((p) => existing.has(p.programId));
  if (programs.length === programEdits.programs.length) {
    return programEdits;
  }
  return { ...programEdits, programs, unseenCount: programs.reduce((sum, p) => sum + p.unseen, 0) };
}

export function SocialState_unseenProgramEdits(programEdits: IProgramEditsResponse | undefined): number {
  return programEdits?.unseenCount ?? 0;
}

export function SocialState_hasUnseenEditsFor(
  state: ISocialState | undefined,
  programId: string,
  loaded: IProgramEdit[]
): boolean {
  const summary = state?.programEdits?.programs.find((p) => p.programId === programId);
  return (summary?.unseen ?? 0) > 0 || loaded.some((e) => !e.seen);
}

export function SocialState_unseenEditsInOtherPrograms(
  programEdits: IProgramEditsResponse | undefined,
  currentProgramId: string
): number {
  return (programEdits?.programs ?? [])
    .filter((p) => p.programId !== currentProgramId)
    .reduce((sum, p) => sum + p.unseen, 0);
}

const recentEditMs = 30 * 24 * 60 * 60 * 1000;

export interface IProgramEditLine {
  text: string;
  isUnseen: boolean;
}

export function SocialState_programEditLine(
  programEdits: IProgramEditsResponse | undefined,
  programId: string,
  now: number
): IProgramEditLine | undefined {
  const summary = programEdits?.programs.find((p) => p.programId === programId);
  if (summary == null || (summary.unseen === 0 && now - summary.latest.createdAt > recentEditMs)) {
    return undefined;
  }
  const name = Follow_displayName(summary.latest.nickname);
  return {
    text: `${name} edited this program · ${RelativeTime_ago(summary.latest.createdAt, now)}`,
    isUnseen: summary.unseen > 0,
  };
}
