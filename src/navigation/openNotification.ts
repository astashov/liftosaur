import { lb } from "lens-shmens";
import { CommonActions } from "@react-navigation/native";
import { navigationRef } from "./navigationRef";
import { FriendNotification_parseTap, IFriendNotificationTarget } from "../models/friendNotification";
import { IDispatch } from "../ducks/types";
import { IState, updateState } from "../models/state";
import { Thunk_pushScreen } from "../ducks/thunks";
import { Thunk_loadFollows } from "../ducks/socialThunks";

const readyPollMs = 200;
const readyPollAttempts = 50;

export function OpenNotification_open(
  data: unknown,
  getUserId: () => string | undefined,
  dispatch: IDispatch,
  attempt: number = 0
): void {
  if (!navigationRef.isReady() || getUserId() == null) {
    if (attempt < readyPollAttempts) {
      setTimeout(() => OpenNotification_open(data, getUserId, dispatch, attempt + 1), readyPollMs);
    }
    return;
  }
  const target = FriendNotification_parseTap(data, getUserId());
  if (target != null) {
    navigate(target, dispatch);
  }
}

function navigate(target: IFriendNotificationTarget, dispatch: IDispatch): void {
  if (target.screen === "friends") {
    dispatch(Thunk_loadFollows());
    navigationRef.dispatch(
      CommonActions.navigate({
        name: "mainTabs",
        params: { screen: "me", params: { screen: "friends", initial: false } },
      })
    );
    return;
  }
  if (target.screen === "programEdits") {
    navigationRef.dispatch(
      CommonActions.navigate({
        name: "mainTabs",
        params: {
          screen: "program",
          params: { screen: "programEdits", params: { programId: target.programId }, initial: false },
        },
      })
    );
    return;
  }
  updateState(
    dispatch,
    [lb<IState>().p("scrollToHistoryRecordId").record(target.historyRecordId)],
    "Open reacted workout"
  );
  dispatch(Thunk_pushScreen("main", undefined, { tab: "home" }));
}
