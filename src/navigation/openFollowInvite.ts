import { navigationRef } from "./navigationRef";
import { navigateTo } from "./navigationService";

const readyPollMs = 200;
const readyPollAttempts = 50;

export function OpenFollowInvite_open(token: string, attempt: number = 0): void {
  if (!navigationRef.isReady()) {
    if (attempt < readyPollAttempts) {
      setTimeout(() => OpenFollowInvite_open(token, attempt + 1), readyPollMs);
    }
    return;
  }
  navigateTo("friends", undefined, { tab: "me" });
  navigateTo("followInvite", { token });
}
