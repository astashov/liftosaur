import RB from "rollbar";
import { Platform } from "react-native";
import { UrlUtils_build } from "./url";
import { IAffiliateData } from "../types";
import { IEventPayload } from "../api/service";
import { EventManager_isAvailable, EventManager_log } from "./eventManager";

declare let Rollbar: RB;
declare let __API_HOST__: string;
declare let __COMMIT_HASH__: string;

export function LogUtils_log(
  user: string,
  action: string,
  affiliates: Partial<Record<string, IAffiliateData>>,
  subscriptions: string[],
  referrer?: string,
  landingPage?: string
): void {
  const platform = {
    name: Platform.OS,
    version: "RN",
  };

  if (EventManager_isAvailable()) {
    const event: IEventPayload = {
      type: "log",
      userId: user,
      timestamp: Date.now(),
      action,
      affiliates,
      subscriptions,
      referrer,
      landingPage,
      platform,
      commithash: typeof __COMMIT_HASH__ !== "undefined" ? __COMMIT_HASH__ : "unknown",
    };
    EventManager_log(JSON.stringify(event));
    return;
  }

  const url = UrlUtils_build(`${__API_HOST__}/api/log`);
  try {
    fetch(url.toString(), {
      method: "POST",
      body: JSON.stringify({ user, action, affiliates, platform, subscriptions, referrer, landingPage }),
      credentials: "include",
    });
  } catch (e) {
    if (Rollbar != null) {
      Rollbar.error("Log failed");
    }
  }
}
