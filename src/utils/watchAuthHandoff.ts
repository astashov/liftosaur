import { IAuthToken } from "./keychain";
import { IUser } from "../models/user";
import { IStorage } from "../types";
import { AdminDebug_isDebugAccountId } from "../models/adminDebug";

export type IWatchAuthSource = "startup" | "request";

export type IWatchAuthDecision =
  | { kind: "send"; auth: IAuthToken }
  | { kind: "clearWatch"; storedUserId: string }
  | { kind: "sendNoAuth" }
  | { kind: "nothing" };

export function WatchAuthHandoff_accountId(
  user: IUser | undefined,
  storage: Pick<IStorage, "email" | "tempUserId">
): string | undefined {
  if (AdminDebug_isDebugAccountId(storage.tempUserId)) {
    return undefined;
  }
  if (user != null) {
    return user.id;
  }
  if (storage.email) {
    return storage.tempUserId;
  }
  return undefined;
}

export function WatchAuthHandoff_decide(
  auth: IAuthToken | undefined,
  accountId: string | undefined,
  source: IWatchAuthSource
): IWatchAuthDecision {
  if (!auth?.token || !accountId) {
    return source === "request" ? { kind: "sendNoAuth" } : { kind: "nothing" };
  }
  return auth.userId === accountId ? { kind: "send", auth } : { kind: "clearWatch", storedUserId: auth.userId || "" };
}
