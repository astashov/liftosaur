import { CommonActions } from "@react-navigation/native";
import { navigationRef } from "./navigationRef";

const readyPollMs = 200;
const readyPollAttempts = 50;

export function OpenFollowInvite_open(token: string, attempt: number = 0): void {
  if (!navigationRef.isReady()) {
    if (attempt < readyPollAttempts) {
      setTimeout(() => OpenFollowInvite_open(token, attempt + 1), readyPollMs);
    }
    return;
  }
  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: "mainTabs",
          state: {
            routes: [
              {
                name: "me",
                state: {
                  index: 1,
                  routes: [{ name: "friends" }, { name: "followInvite", params: { token } }],
                },
              },
            ],
          },
        },
      ],
    })
  );
}
