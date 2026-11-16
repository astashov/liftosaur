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
import { ScreenFeedFilter } from "../../components/social/screenFeedFilter";
import { ScreenFriendPrograms } from "../../components/social/screenFriendPrograms";
import { ScreenFriendProgram } from "../../components/social/screenFriendProgram";
import { ScreenProgramEdits } from "../../components/social/screenProgramEdits";
import { SocialState_forAccount } from "../../models/socialState";
import { trackedSocial } from "../utils";
import type { IAllScreenParamList } from "../types";

function useSocial(): ReturnType<typeof SocialState_forAccount> {
  return trackedSocial(useTrackedState());
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
      <ScreenFriends
        dispatch={dispatch}
        social={social}
        userId={state.user?.id}
        nickname={untrack(state.storage.settings.nickname)}
      />
    </NavScreenContent>
  );
}

export function NavScreenFriendInvite(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const { service } = useAppContext();
  return (
    <NavScreenContent>
      <ScreenFriendInvite
        service={service}
        userId={state.user?.id ?? ""}
        nickname={untrack(state.storage.settings.nickname)}
        dispatch={dispatch}
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
      <ScreenFollowInvite
        token={params.token}
        userId={state.user?.id}
        ownNickname={untrack(state.storage.settings.nickname)}
        service={service}
        dispatch={dispatch}
      />
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

export function NavScreenFriendPrograms(): JSX.Element {
  const dispatch = useTrackedDispatch();
  const social = useSocial();
  const params = useParams<"friendPrograms">();
  return (
    <NavScreenContent>
      <ScreenFriendPrograms userId={params.userId} social={social} dispatch={dispatch} />
    </NavScreenContent>
  );
}

export function NavScreenFriendProgram(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const social = useSocial();
  const params = useParams<"friendProgram">();
  return (
    <View className="flex-1 bg-background-default">
      <ScreenFriendProgram
        userId={params.userId}
        programId={params.programId}
        social={social}
        settings={untrack(state.storage.settings)}
        stats={untrack(state.storage.stats)}
        subscription={untrack(state.storage.subscription)}
        dispatch={dispatch}
      />
    </View>
  );
}

export function NavScreenProgramEdits(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const social = useSocial();
  const params = useParams<"programEdits">();
  const programName = state.storage.programs.find((p) => p.id === params.programId)?.name;
  return (
    <NavScreenContent>
      <ScreenProgramEdits programId={params.programId} programName={programName} social={social} dispatch={dispatch} />
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
