import { JSX, useEffect, useMemo, useState } from "react";
import { Service } from "../../api/service";
import { FeedWorkoutCard } from "../../components/social/feedWorkoutCard";
import { IconSpinner } from "../../components/icons/iconSpinner";
import { FeedMerge_dateHeaderKeys } from "../../models/feedMerge";
import { FeedWorkout_key } from "../../models/feedWorkout";
import { IFriendsPageData } from "../../models/friendsWeb";
import { IReaction } from "../../models/reactions";
import {
  FriendFeedPage_beginLoad,
  FriendFeedPage_beginReaction,
  FriendFeedPage_canLoadMore,
  FriendFeedPage_finishLoad,
  FriendFeedPage_finishReaction,
  FriendFeedPage_init,
  FriendFeedPage_isLoading,
  FriendFeedPage_reactionError,
  FriendFeedPage_status,
  FriendFeedPage_workouts,
} from "../../models/friendFeedPage";
import { DateUtils_formatYYYYMMDD } from "../../utils/date";
import { Dialog_alert } from "../../utils/dialog";

type IFriendWorkoutsProps = Extract<IFriendsPageData, { kind: "workouts" }> & { client: Window["fetch"] };

export function FriendWorkoutsContent(props: IFriendWorkoutsProps): JSX.Element {
  const service = useMemo(() => new Service(props.client), [props.client]);
  const [page, setPage] = useState(() => FriendFeedPage_init(props.account.id, props.ownerId, props.feed));
  // Reanimated views in the reaction bar render different HTML on the server, which breaks hydration
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  const workouts = FriendFeedPage_workouts(page);
  const dateHeaderKeys = FeedMerge_dateHeaderKeys(
    workouts,
    (w) => FeedWorkout_key(w.ownerId, w.recordId),
    (w) => DateUtils_formatYYYYMMDD(w.date)
  );

  const load = async (): Promise<void> => {
    const started = FriendFeedPage_beginLoad(page);
    const request = started.request;
    setPage(started.page);
    if (request != null) {
      const result = await service.getFeed(request);
      setPage((current) => FriendFeedPage_finishLoad(current, request, result));
    }
  };

  const react = async (recordId: number, reaction: IReaction | undefined): Promise<void> => {
    const started = FriendFeedPage_beginReaction(page, props.viewer, recordId, reaction);
    const request = started.request;
    setPage(started.page);
    if (request != null) {
      const result = await service.setReaction(props.ownerId, recordId, reaction);
      setPage((current) => FriendFeedPage_finishReaction(current, request, result.success));
      if (!result.success) {
        Dialog_alert(FriendFeedPage_reactionError);
      }
    }
  };

  const status = FriendFeedPage_status(page);
  const isLoading = FriendFeedPage_isLoading(page);
  if (status === "empty") {
    return <p className="text-text-secondary">No workouts yet.</p>;
  }
  if (status === "failed") {
    return (
      <div className="max-w-xl" data-testid="friends-web-workouts-failed">
        <p className="mb-4 text-text-secondary">Couldn't load the workouts.</p>
        <button
          className="px-4 py-2 font-semibold border rounded-lg border-border-neutral"
          disabled={isLoading}
          onClick={load}
        >
          {isLoading ? <IconSpinner width={16} height={16} /> : "Retry"}
        </button>
      </div>
    );
  }
  return (
    <div className="max-w-xl" data-testid="friends-web-workouts">
      {workouts.map((workout) => {
        const key = FeedWorkout_key(workout.ownerId, workout.recordId);
        return (
          <div key={key} className="mb-6">
            <FeedWorkoutCard
              workout={workout}
              nickname={props.name}
              reactions={page.social.reactions[key]}
              settings={props.settings}
              showIdentity={false}
              showDate={dateHeaderKeys.has(key)}
              isReactionBarHidden={!isMounted}
              onReact={(reaction) => react(workout.recordId, reaction)}
            />
          </div>
        );
      })}
      {(FriendFeedPage_canLoadMore(page) || isLoading) && (
        <button
          className="w-full py-2 mb-8 font-semibold border rounded-lg border-border-neutral"
          disabled={isLoading}
          onClick={load}
          data-testid="friends-web-load-more"
        >
          {isLoading ? <IconSpinner width={16} height={16} /> : "Load more"}
        </button>
      )}
    </div>
  );
}
