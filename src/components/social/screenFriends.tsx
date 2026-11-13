import { JSX, ReactNode, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Pressable, View } from "react-native";
import { Text } from "../primitives/text";
import { IDispatch } from "../../ducks/types";
import { useNavOptions } from "../../navigation/useNavOptions";
import { ISocialState } from "../../models/socialState";
import { Thunk_pushScreen } from "../../ducks/thunks";
import { Thunk_loadFollows, Thunk_removeFollowRequest } from "../../ducks/socialThunks";
import { Button } from "../button";
import { Avatar } from "./avatar";
import { IconArrowRight } from "../icons/iconArrowRight";
import { IconClose } from "../icons/iconClose";
import { IconUser } from "../icons/iconUser";
import { RelativeTime_ago } from "../../utils/relativeTime";

interface IProps {
  dispatch: IDispatch;
  social?: ISocialState;
  userId?: string;
}

function Section(props: { title: string; children: ReactNode }): JSX.Element {
  return (
    <View className="mt-5">
      <Text className="px-1 mb-2 text-sm text-text-secondary">{props.title}</Text>
      <View className="px-4 border rounded-2xl bg-background-cardpurple border-border-cardpurple">
        {props.children}
      </View>
    </View>
  );
}

function PersonRow(props: {
  seed: string;
  nickname?: string;
  subtitle?: string;
  isLast: boolean;
  testID: string;
  onPress?: () => void;
  right?: ReactNode;
}): JSX.Element {
  return (
    <Pressable
      testID={props.testID}
      data-testid={props.testID}
      onPress={props.onPress}
      disabled={props.onPress == null}
      className={`flex-row items-center gap-3 py-3 ${props.isLast ? "" : "border-b border-border-cardpurple"}`}
    >
      <Avatar seed={props.seed} nickname={props.nickname} size={44} />
      <View className="flex-1">
        <Text className="text-base font-semibold" numberOfLines={1}>
          {props.nickname || "Liftosaur lifter"}
        </Text>
        {props.subtitle ? <Text className="text-xs text-text-secondary">{props.subtitle}</Text> : null}
      </View>
      {props.right ?? (props.onPress != null ? <IconArrowRight /> : null)}
    </Pressable>
  );
}

export function ScreenFriends(props: IProps): JSX.Element {
  useNavOptions({ navTitle: "Friends" });
  const isLoggedIn = props.userId != null;
  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn) {
        props.dispatch(Thunk_loadFollows());
      }
    }, [isLoggedIn, props.userId])
  );

  if (!isLoggedIn) {
    return (
      <View className="items-center py-10 px-gutter">
        <Text className="mb-2 text-lg font-semibold">Train together</Text>
        <Text className="mb-4 text-center text-text-secondary">Log in to follow friends and see their workouts.</Text>
        <Button kind="purple" name="friends-login" onClick={() => props.dispatch(Thunk_pushScreen("account"))}>
          Log in
        </Button>
      </View>
    );
  }

  const follows = props.social?.follows;
  const now = Date.now();
  const isEmpty =
    follows != null &&
    follows.following.length + follows.followers.length + follows.incoming.length + follows.outgoing.length === 0;

  return (
    <View className="pb-8 px-gutter">
      {isEmpty ? (
        <View className="items-center py-10">
          <View
            className="items-center justify-center mb-4 rounded-full bg-background-cardpurple"
            style={{ width: 88, height: 88 }}
          >
            <IconUser size={40} />
          </View>
          <Text className="mb-2 text-lg font-semibold">Train together</Text>
          <Text className="mb-6 text-center text-text-secondary">
            Invite a friend to follow your training. You choose what they can see after they ask.
          </Text>
        </View>
      ) : null}
      <View className="mt-4">
        <Button
          kind="purple"
          name="friends-invite"
          data-testid="friends-invite"
          testID="friends-invite"
          className="w-full"
          onClick={() => props.dispatch(Thunk_pushScreen("friendInvite"))}
        >
          Invite a friend
        </Button>
      </View>
      {follows != null && follows.incoming.length > 0 && (
        <Section title={`Incoming requests · ${follows.incoming.length}`}>
          {follows.incoming.map((request, i) => (
            <PersonRow
              key={request.requestId}
              testID="friends-incoming"
              seed={request.requestId}
              nickname={request.nickname}
              subtitle="Wants to follow your training"
              isLast={i === follows.incoming.length - 1}
              right={
                <View className="flex-row items-center gap-2">
                  <Button
                    kind="purple"
                    buttonSize="md"
                    name="friends-approve"
                    data-testid="friends-approve"
                    testID="friends-approve"
                    onClick={() => props.dispatch(Thunk_pushScreen("friendRequest", { requestId: request.requestId }))}
                  >
                    Approve
                  </Button>
                  <Pressable
                    testID="friends-decline"
                    data-testid="friends-decline"
                    className="p-2 border rounded-lg border-border-neutral"
                    onPress={() => props.dispatch(Thunk_removeFollowRequest(request.requestId))}
                  >
                    <IconClose size={16} />
                  </Pressable>
                </View>
              }
            />
          ))}
        </Section>
      )}
      {follows != null && follows.following.length > 0 && (
        <Section title={`Following · ${follows.following.length}`}>
          {follows.following.map((person, i) => (
            <PersonRow
              key={person.userId}
              testID="friends-following"
              seed={person.userId}
              nickname={person.nickname}
              subtitle={
                person.lastWorkoutAt != null ? `Trained ${RelativeTime_ago(person.lastWorkoutAt, now)}` : undefined
              }
              isLast={i === follows.following.length - 1}
              onPress={() => props.dispatch(Thunk_pushScreen("friendProfile", { userId: person.userId }))}
            />
          ))}
        </Section>
      )}
      {follows != null && follows.followers.length > 0 && (
        <Section title={`Followers · ${follows.followers.length}`}>
          {follows.followers.map((person, i) => (
            <PersonRow
              key={person.userId}
              testID="friends-follower"
              seed={person.userId}
              nickname={person.nickname}
              subtitle={person.permissions.notes ? "Sees workouts and notes" : "Sees workouts"}
              isLast={i === follows.followers.length - 1}
              onPress={() => props.dispatch(Thunk_pushScreen("friendFollower", { userId: person.userId }))}
            />
          ))}
        </Section>
      )}
      {follows != null && follows.outgoing.length > 0 && (
        <Section title={`Sent · ${follows.outgoing.length}`}>
          {follows.outgoing.map((request, i) => (
            <PersonRow
              key={request.requestId}
              testID="friends-outgoing"
              seed={request.requestId}
              nickname={request.nickname}
              subtitle="Awaiting approval"
              isLast={i === follows.outgoing.length - 1}
              right={
                <View className="flex-row items-center gap-2">
                  <View className="px-3 py-1 border rounded-lg bg-background-cardyellow border-border-cardyellow">
                    <Text className="text-sm font-semibold text-text-cardyellow">Pending</Text>
                  </View>
                  <Pressable
                    testID="friends-cancel-request"
                    data-testid="friends-cancel-request"
                    className="p-2 border rounded-lg border-border-neutral"
                    onPress={() => props.dispatch(Thunk_removeFollowRequest(request.requestId))}
                  >
                    <IconClose size={16} />
                  </Pressable>
                </View>
              }
            />
          ))}
        </Section>
      )}
    </View>
  );
}
