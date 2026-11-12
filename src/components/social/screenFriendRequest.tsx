import { JSX, useState } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { useNavOptions } from "../../navigation/useNavOptions";
import { IDispatch } from "../../ducks/types";
import { ISocialState } from "../../models/socialState";
import { Follow_defaultPermissions, IFollowPermissions } from "../../models/follow";
import {
  Thunk_approveFollow,
  Thunk_removeFollower,
  Thunk_removeFollowRequest,
  Thunk_setFollowerPermissions,
} from "../../ducks/socialThunks";
import { Thunk_pullScreen } from "../../ducks/thunks";
import { Switch } from "../primitives/switch";
import { Button } from "../button";
import { Avatar } from "./avatar";

function PermissionsCard(props: {
  name?: string;
  permissions: IFollowPermissions;
  onChange: (permissions: IFollowPermissions) => void;
}): JSX.Element {
  return (
    <View className="w-full mt-6">
      <Text className="px-1 mb-2 text-sm text-text-secondary">Choose what {props.name || "they"} can see</Text>
      <View className="px-4 border rounded-2xl bg-background-cardpurple border-border-cardpurple">
        <View className="flex-row items-center py-3 border-b border-border-cardpurple">
          <View className="flex-1">
            <Text className="text-base font-semibold">Workouts</Text>
            <Text className="text-xs text-text-secondary">Exercises, sets, reps and weights. Always on.</Text>
          </View>
        </View>
        <View className="flex-row items-center py-3">
          <View className="flex-1 pr-2">
            <Text className="text-base font-semibold">Exercise & workout notes</Text>
            <Text className="text-xs text-text-secondary">Notes you write on exercises and workouts.</Text>
          </View>
          <Switch
            value={props.permissions.notes}
            testID="follow-permission-notes"
            onValueChange={(notes: boolean) => props.onChange({ ...props.permissions, notes })}
          />
        </View>
      </View>
    </View>
  );
}

export function ScreenFriendRequest(props: {
  requestId: string;
  social?: ISocialState;
  dispatch: IDispatch;
}): JSX.Element {
  useNavOptions({ navTitle: "Follow request" });
  const [permissions, setPermissions] = useState<IFollowPermissions>(Follow_defaultPermissions);
  const [followBack, setFollowBack] = useState(true);
  const request = props.social?.follows?.incoming.find((r) => r.requestId === props.requestId);
  if (request == null) {
    return (
      <View className="py-10 px-gutter">
        <Text className="text-center text-text-secondary">This request is no longer pending.</Text>
      </View>
    );
  }
  const decide = (approve: boolean): void => {
    props.dispatch(
      approve
        ? Thunk_approveFollow(request.requestId, permissions, followBack)
        : Thunk_removeFollowRequest(request.requestId)
    );
    props.dispatch(Thunk_pullScreen());
  };
  return (
    <View className="items-center pt-6 px-gutter">
      <Avatar seed={request.requestId} nickname={request.nickname} size={72} />
      <Text className="mt-3 text-lg font-semibold">{request.nickname || "Liftosaur lifter"}</Text>
      <Text className="mt-1 text-text-secondary">Wants to follow your training</Text>
      <PermissionsCard name={request.nickname} permissions={permissions} onChange={setPermissions} />
      <View className="flex-row items-center w-full px-1 mt-4">
        <Text className="flex-1 text-base">Follow {request.nickname || "them"} back</Text>
        <Switch value={followBack} testID="follow-back" onValueChange={(value: boolean) => setFollowBack(value)} />
      </View>
      <Text className="w-full px-1 mt-1 text-xs text-text-secondary">
        Sends them a request. They choose what you can see.
      </Text>
      <View className="flex-row w-full mt-8 gap-3">
        <View className="flex-1">
          <Button kind="lightgrayv3" name="follow-decline" className="w-full" onClick={() => decide(false)}>
            Decline
          </Button>
        </View>
        <View className="flex-1">
          <Button
            kind="purple"
            name="follow-approve"
            data-testid="follow-approve"
            testID="follow-approve"
            className="w-full"
            onClick={() => decide(true)}
          >
            Approve
          </Button>
        </View>
      </View>
    </View>
  );
}

export function ScreenFriendFollower(props: {
  userId: string;
  social?: ISocialState;
  dispatch: IDispatch;
}): JSX.Element {
  useNavOptions({ navTitle: "Follower" });
  const follower = props.social?.follows?.followers.find((f) => f.userId === props.userId);
  if (follower == null) {
    return (
      <View className="py-10 px-gutter">
        <Text className="text-center text-text-secondary">They no longer follow you.</Text>
      </View>
    );
  }
  return (
    <View className="items-center pt-6 px-gutter">
      <Avatar seed={follower.userId} nickname={follower.nickname} size={72} />
      <Text className="mt-3 text-lg font-semibold">{follower.nickname || follower.userId}</Text>
      <PermissionsCard
        name={follower.nickname}
        permissions={follower.permissions}
        onChange={(permissions) => props.dispatch(Thunk_setFollowerPermissions(follower.userId, permissions))}
      />
      <View className="w-full mt-8">
        <Button
          kind="red"
          name="follower-remove"
          data-testid="follower-remove"
          testID="follower-remove"
          className="w-full"
          onClick={() => {
            props.dispatch(Thunk_removeFollower(follower.userId));
            props.dispatch(Thunk_pullScreen());
          }}
        >
          Remove follower
        </Button>
      </View>
    </View>
  );
}
