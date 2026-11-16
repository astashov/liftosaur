import { IEither } from "../utils/types";
import { CollectionUtils_compact } from "../utils/collection";
import { FeedWorkout_key, IFeedResponse, IFeedWorkout } from "./feedWorkout";
import { IReaction, IReactionSummary, IReactor } from "./reactions";
import {
  ISocialState,
  SocialState_applyFeedPage,
  SocialState_applyReaction,
  SocialState_empty,
  SocialState_failLoading,
  SocialState_restoreReaction,
  SocialState_startLoading,
} from "./socialState";

export interface IFriendFeedPage {
  ownerId: string;
  social: ISocialState;
  reactingKeys: string[];
  didLastLoadFail: boolean;
}

export type IFriendFeedPageStatus = "list" | "failed" | "empty";

export interface IFriendFeedLoadRequest {
  owners: string[];
  cursor?: string;
}

export interface IFriendFeedReactionRequest {
  key: string;
  recordId: number;
  reaction: IReaction | undefined;
  previous: IReactionSummary | undefined;
}

export function FriendFeedPage_init(viewerId: string, ownerId: string, feed: IFeedResponse): IFriendFeedPage {
  const social = SocialState_applyFeedPage(SocialState_empty(viewerId), ownerId, feed, true);
  return { ownerId, social, reactingKeys: [], didLastLoadFail: false };
}

export function FriendFeedPage_workouts(page: IFriendFeedPage): IFeedWorkout[] {
  const keys = page.social.pages[page.ownerId]?.keys ?? [];
  return CollectionUtils_compact(keys.map((key) => page.social.workouts[key]));
}

export function FriendFeedPage_status(page: IFriendFeedPage): IFriendFeedPageStatus {
  if (FriendFeedPage_workouts(page).length > 0) {
    return "list";
  }
  const failedOwners = page.social.pages[page.ownerId]?.failedOwners ?? [];
  return failedOwners.length > 0 || page.didLastLoadFail ? "failed" : "empty";
}

export function FriendFeedPage_canLoadMore(page: IFriendFeedPage): boolean {
  const feedPage = page.social.pages[page.ownerId];
  return feedPage != null && !feedPage.isLoading && feedPage.hasMore;
}

export function FriendFeedPage_isLoading(page: IFriendFeedPage): boolean {
  return page.social.pages[page.ownerId]?.isLoading ?? false;
}

export function FriendFeedPage_beginLoad(page: IFriendFeedPage): {
  page: IFriendFeedPage;
  request?: IFriendFeedLoadRequest;
} {
  const feedPage = page.social.pages[page.ownerId];
  if (feedPage?.isLoading) {
    return { page };
  }
  const isFirstPage = feedPage == null || !feedPage.hasMore;
  const social = SocialState_startLoading(page.social, page.ownerId, isFirstPage);
  return {
    page: { ...page, social, didLastLoadFail: false },
    request: { owners: [page.ownerId], cursor: isFirstPage ? undefined : feedPage.cursor },
  };
}

export function FriendFeedPage_finishLoad(
  page: IFriendFeedPage,
  request: IFriendFeedLoadRequest,
  result: IEither<IFeedResponse, string>
): IFriendFeedPage {
  if (!result.success) {
    return { ...page, social: SocialState_failLoading(page.social, page.ownerId), didLastLoadFail: true };
  }
  const isFirstPage = request.cursor == null;
  return { ...page, social: SocialState_applyFeedPage(page.social, page.ownerId, result.data, isFirstPage) };
}

export function FriendFeedPage_beginReaction(
  page: IFriendFeedPage,
  viewer: IReactor,
  recordId: number,
  reaction: IReaction | undefined
): { page: IFriendFeedPage; request?: IFriendFeedReactionRequest } {
  const key = FeedWorkout_key(page.ownerId, recordId);
  if (page.reactingKeys.includes(key)) {
    return { page };
  }
  const request = { key, recordId, reaction, previous: page.social.reactions[key] };
  return {
    page: {
      ...page,
      social: SocialState_applyReaction(page.social, key, viewer, reaction),
      reactingKeys: [...page.reactingKeys, key],
    },
    request,
  };
}

export const FriendFeedPage_reactionError = "Couldn't save your reaction";

export function FriendFeedPage_finishReaction(
  page: IFriendFeedPage,
  request: IFriendFeedReactionRequest,
  isSaved: boolean
): IFriendFeedPage {
  const reactingKeys = page.reactingKeys.filter((k) => k !== request.key);
  if (isSaved) {
    return { ...page, reactingKeys };
  }
  return { ...page, social: SocialState_restoreReaction(page.social, request.key, request.previous), reactingKeys };
}
