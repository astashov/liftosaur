import { JSX, useCallback, useEffect } from "react";
import { View } from "react-native";
import { LegendList } from "@legendapp/list";
import { Text } from "../primitives/text";
import { useNavOptions } from "../../navigation/useNavOptions";
import { IDispatch } from "../../ducks/types";
import { ISocialState } from "../../models/socialState";
import { IFeedWorkout } from "../../models/feedWorkout";
import { FeedWorkout_key } from "../../models/feedWorkout";
import { ISettings } from "../../types";
import { Thunk_loadFeed, Thunk_react, Thunk_unfollow } from "../../ducks/socialThunks";
import { Thunk_pullScreen, Thunk_pushScreen } from "../../ducks/thunks";
import { CollectionUtils_compact } from "../../utils/collection";
import { FeedWorkoutCard } from "./feedWorkoutCard";
import { Avatar } from "./avatar";
import { Button } from "../button";
import { IconSpinner } from "../icons/iconSpinner";
import { Dialog_confirm } from "../../utils/dialog";

interface IProps {
  userId: string;
  social?: ISocialState;
  settings: ISettings;
  dispatch: IDispatch;
}

export function ScreenFriendProfile(props: IProps): JSX.Element {
  const person = props.social?.follows?.following.find((f) => f.userId === props.userId);
  const nickname = person?.nickname ?? props.social?.owners[props.userId]?.nickname;
  useNavOptions({ navTitle: nickname || "Friend" });
  const page = props.social?.pages[props.userId];
  const workouts = CollectionUtils_compact((page?.keys ?? []).map((key) => props.social?.workouts[key]));

  useEffect(() => {
    props.dispatch(Thunk_loadFeed(props.userId, true));
  }, [props.userId]);

  const now = Date.now();
  const renderItem = useCallback(
    ({ item }: { item: IFeedWorkout }) => (
      <View className="mx-4 mb-6">
        <FeedWorkoutCard
          workout={item}
          nickname={nickname}
          reactions={props.social?.reactions[FeedWorkout_key(item.ownerId, item.recordId)]}
          settings={props.settings}
          now={now}
          maxExercises={4}
          showIdentity={false}
          onOpen={() =>
            props.dispatch(Thunk_pushScreen("friendWorkout", { ownerId: item.ownerId, recordId: item.recordId }))
          }
          onReact={(reaction) => props.dispatch(Thunk_react(item.ownerId, item.recordId, reaction))}
        />
      </View>
    ),
    [props.social?.reactions, props.settings, nickname]
  );

  const header = (
    <View className="flex-row items-center gap-3 px-4 pt-2 pb-4 mb-4 border-b border-border-neutral">
      <Avatar seed={props.userId} nickname={nickname} size={56} />
      <View className="flex-1">
        <Text className="text-lg font-semibold">{nickname || props.userId}</Text>
        <Text className="text-xs text-text-secondary">{props.userId}</Text>
      </View>
      <Button
        kind="lightgrayv3"
        buttonSize="md"
        name="friend-unfollow"
        data-testid="friend-unfollow"
        testID="friend-unfollow"
        onClick={async () => {
          if (await Dialog_confirm(`Stop following ${nickname || "them"}?`)) {
            props.dispatch(Thunk_unfollow(props.userId));
            props.dispatch(Thunk_pullScreen());
          }
        }}
      >
        Unfollow
      </Button>
    </View>
  );

  return (
    <View className="flex-1">
      <LegendList
        data={workouts}
        renderItem={renderItem}
        keyExtractor={(item: IFeedWorkout) => FeedWorkout_key(item.ownerId, item.recordId)}
        estimatedItemSize={360}
        ListHeaderComponent={header}
        ListEmptyComponent={
          page?.isLoading || page == null ? (
            <View className="items-center py-8">
              <IconSpinner width={24} height={24} />
            </View>
          ) : (
            <Text className="py-8 text-center text-text-secondary">No workouts yet.</Text>
          )
        }
        onEndReached={() => props.dispatch(Thunk_loadFeed(props.userId, false))}
      />
    </View>
  );
}
