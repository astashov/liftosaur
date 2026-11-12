import { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { useNavOptions } from "../../navigation/useNavOptions";
import { IDispatch } from "../../ducks/types";
import { ISocialState } from "../../models/socialState";
import { FeedWorkout_key } from "../../models/feedWorkout";
import { Reactions_reactorsLine } from "../../models/reactions";
import { ISettings } from "../../types";
import { Thunk_react } from "../../ducks/socialThunks";
import { Thunk_pushScreen } from "../../ducks/thunks";
import { DateUtils_format } from "../../utils/date";
import { FeedWorkoutCard } from "./feedWorkoutCard";
import { Avatar } from "./avatar";

interface IProps {
  ownerId: string;
  recordId: number;
  social?: ISocialState;
  settings: ISettings;
  dispatch: IDispatch;
}

export function ScreenFriendWorkout(props: IProps): JSX.Element {
  const key = FeedWorkout_key(props.ownerId, props.recordId);
  const workout = props.social?.workouts[key];
  const reactions = props.social?.reactions[key];
  const nickname = props.social?.owners[props.ownerId]?.nickname;
  useNavOptions({ navTitle: workout != null ? DateUtils_format(workout.date, false, true) : "Workout" });
  if (workout == null) {
    return (
      <View className="py-10 px-gutter">
        <Text className="text-center text-text-secondary">This workout is no longer available.</Text>
      </View>
    );
  }
  return (
    <View className="pt-4 pb-8 px-gutter">
      <FeedWorkoutCard
        workout={workout}
        nickname={nickname}
        reactions={reactions}
        settings={props.settings}
        now={Date.now()}
        showIdentity={true}
        onOpenOwner={() => props.dispatch(Thunk_pushScreen("friendProfile", { userId: props.ownerId }))}
        onReact={(reaction) => props.dispatch(Thunk_react(props.ownerId, props.recordId, reaction))}
      />
      {reactions != null && reactions.total > 0 && (
        <View className="flex-row items-center gap-3 px-1 mt-4">
          <View className="flex-row">
            {reactions.reactors.slice(0, 4).map((reactor, i) => (
              <View key={reactor.userId} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                <Avatar seed={reactor.userId} nickname={reactor.nickname} size={28} />
              </View>
            ))}
          </View>
          <Text className="flex-1 text-sm text-text-secondary">{Reactions_reactorsLine(reactions)}</Text>
        </View>
      )}
    </View>
  );
}
