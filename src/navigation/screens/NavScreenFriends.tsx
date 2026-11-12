import { JSX } from "react";
import { View } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useTrackedState, useTrackedDispatch, untrack } from "../TrackedStateContext";
import { NavScreenContent } from "../NavScreenContent";
import { useAppContext } from "../../components/appContext";
import { ScreenFriends } from "../../components/social/screenFriends";
import { ScreenFriendInvite } from "../../components/social/screenFriendInvite";
import { ScreenFollowInvite } from "../../components/social/screenFollowInvite";
import { ScreenFriendFollower, ScreenFriendRequest } from "../../components/social/screenFriendRequest";
import { ScreenFriendProfile } from "../../components/social/screenFriendProfile";
import { ScreenFriendWorkout } from "../../components/social/screenFriendWorkout";
import { ScreenFeedFilter } from "../../components/social/screenFeedFilter";
import { SocialState_forAccount } from "../../models/socialState";
import type { IAllScreenParamList } from "../types";

function useSocial(): ReturnType<typeof SocialState_forAccount> {
  const state = useTrackedState();
  return SocialState_forAccount(untrack(state.social), state.user?.id);
}

function useParams<T extends keyof IAllScreenParamList>(): IAllScreenParamList[T] {
  const route = useRoute<{ key: string; name: T; params: IAllScreenParamList[T] }>();
  return route.params;
}

export function NavScreenFriends(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const social = useSocial();
  return (
    <NavScreenContent>
      <ScreenFriends dispatch={dispatch} social={social} userId={state.user?.id} />
    </NavScreenContent>
  );
}

export function NavScreenFriendInvite(): JSX.Element {
  const state = useTrackedState();
  const { service } = useAppContext();
  return (
    <NavScreenContent>
      <ScreenFriendInvite
        service={service}
        userId={state.user?.id ?? ""}
        nickname={untrack(state.storage.settings.nickname)}
      />
    </NavScreenContent>
  );
}

export function NavScreenFollowInvite(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const { service } = useAppContext();
  const params = useParams<"followInvite">();
  return (
    <NavScreenContent>
      <ScreenFollowInvite token={params.token} userId={state.user?.id} service={service} dispatch={dispatch} />
    </NavScreenContent>
  );
}

export function NavScreenFriendRequest(): JSX.Element {
  const dispatch = useTrackedDispatch();
  const social = useSocial();
  const params = useParams<"friendRequest">();
  return (
    <NavScreenContent>
      <ScreenFriendRequest requestId={params.requestId} social={social} dispatch={dispatch} />
    </NavScreenContent>
  );
}

export function NavScreenFriendFollower(): JSX.Element {
  const dispatch = useTrackedDispatch();
  const social = useSocial();
  const params = useParams<"friendFollower">();
  return (
    <NavScreenContent>
      <ScreenFriendFollower userId={params.userId} social={social} dispatch={dispatch} />
    </NavScreenContent>
  );
}

export function NavScreenFriendProfile(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const social = useSocial();
  const params = useParams<"friendProfile">();
  return (
    <View className="flex-1 bg-background-default">
      <ScreenFriendProfile
        userId={params.userId}
        social={social}
        settings={untrack(state.storage.settings)}
        dispatch={dispatch}
      />
    </View>
  );
}

export function NavScreenFriendWorkout(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const social = useSocial();
  const params = useParams<"friendWorkout">();
  return (
    <NavScreenContent>
      <ScreenFriendWorkout
        ownerId={params.ownerId}
        recordId={params.recordId}
        social={social}
        settings={untrack(state.storage.settings)}
        dispatch={dispatch}
      />
    </NavScreenContent>
  );
}

export function NavScreenFeedFilter(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const social = useSocial();
  return (
    <View className="flex-1 bg-background-default">
      <ScreenFeedFilter
        userId={state.user?.id ?? ""}
        nickname={untrack(state.storage.settings.nickname)}
        social={social}
        dispatch={dispatch}
      />
    </View>
  );
}
