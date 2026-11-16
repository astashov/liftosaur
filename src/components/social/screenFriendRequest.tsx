import { JSX, useState } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { useNavOptions } from "../../navigation/useNavOptions";
import { IDispatch } from "../../ducks/types";
import { ISocialState } from "../../models/socialState";
import {
  Follow_defaultPermissions,
  Follow_displayName,
  Follow_setPermission,
  IFollowPermissions,
} from "../../models/follow";
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
  isDisabled?: boolean;
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
        <View className="flex-row items-center py-3 border-b border-border-cardpurple">
          <View className="flex-1 pr-2">
            <Text className="text-base font-semibold">Exercise & workout notes</Text>
            <Text className="text-xs text-text-secondary">Notes you write on exercises and workouts.</Text>
          </View>
          <Switch
            value={props.permissions.notes}
            disabled={props.isDisabled}
            testID="follow-permission-notes"
            onValueChange={(value: boolean) => props.onChange(Follow_setPermission(props.permissions, "notes", value))}
          />
        </View>
        <View className="flex-row items-center py-3">
          <View className="flex-1 pr-2">
            <Text className="text-base font-semibold">See and edit my programs</Text>
            <Text className="text-xs text-text-secondary">
              {props.name || "They"} can change your programs directly. Every change shows in the program's history.
            </Text>
          </View>
          <Switch
            value={props.permissions.programs}
            disabled={props.isDisabled}
            testID="follow-permission-programs"
            onValueChange={(value: boolean) =>
              props.onChange(Follow_setPermission(props.permissions, "programs", value))
            }
          />
        </View>
      </View>
      <Text className="px-1 mt-2 text-xs text-text-secondary">
        They can also see these through apps they connect, like AI assistants.
      </Text>
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
  const [pending, setPending] = useState<"approve" | "decline" | undefined>(undefined);
  const request = props.social?.follows?.incoming.find((r) => r.requestId === props.requestId);
  if (request == null && pending == null) {
    return (
      <View className="py-10 px-gutter">
        <Text className="text-center text-text-secondary">This request is no longer pending.</Text>
      </View>
    );
  }
  if (request == null) {
    return <View />;
  }
  const approve = async (): Promise<void> => {
    setPending("approve");
    await props.dispatch(Thunk_approveFollow(request.requestId, permissions, followBack));
    props.dispatch(Thunk_pullScreen());
  };
  const decline = async (): Promise<void> => {
    setPending("decline");
    await props.dispatch(Thunk_removeFollowRequest(request.requestId));
    props.dispatch(Thunk_pullScreen());
  };
  return (
    <View className="items-center pt-6 px-gutter">
      <Avatar nickname={request.nickname} size={72} />
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
          <Button
            kind="lightgrayv3"
            name="follow-decline"
            className="w-full"
            onClick={decline}
            isLoading={pending === "decline"}
            disabled={pending === "approve"}
          >
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
            onClick={approve}
            isLoading={pending === "approve"}
            disabled={pending === "decline"}
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
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const follower = props.social?.follows?.followers.find((f) => f.userId === props.userId);
  if (follower == null && isRemoving) {
    return <View />;
  }
  if (follower == null) {
    return (
      <View className="py-10 px-gutter">
        <Text className="text-center text-text-secondary">They no longer follow you.</Text>
      </View>
    );
  }
  return (
    <View className="items-center pt-6 px-gutter">
      <Avatar nickname={follower.nickname} size={72} />
      <Text className="mt-3 text-lg font-semibold">{Follow_displayName(follower.nickname)}</Text>
      <PermissionsCard
        name={follower.nickname}
        permissions={follower.permissions}
        isDisabled={isSaving}
        onChange={async (permissions) => {
          setIsSaving(true);
          try {
            await props.dispatch(Thunk_setFollowerPermissions(follower.userId, permissions));
          } finally {
            setIsSaving(false);
          }
        }}
      />
      <View className="w-full mt-8">
        <Button
          kind="red"
          name="follower-remove"
          data-testid="follower-remove"
          testID="follower-remove"
          className="w-full"
          isLoading={isRemoving}
          onClick={async () => {
            setIsRemoving(true);
            await props.dispatch(Thunk_removeFollower(follower.userId));
            props.dispatch(Thunk_pullScreen());
          }}
        >
          Remove follower
        </Button>
      </View>
    </View>
  );
}
