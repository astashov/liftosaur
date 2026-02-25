import RB from "rollbar";
import { UrlUtils_build } from "./url";
import { IAffiliateData } from "../types";

declare let Rollbar: RB;
declare let __API_HOST__: string;

export async function LogUtils_log(
  user: string,
  action: string,
  affiliates: Partial<Record<string, IAffiliateData>>,
  subscriptions: string[],
  onClear: () => void,
  key?: string,
  referrer?: string
): Promise<void> {
  let enforce = false;
  if (typeof window !== "undefined") {
    const currentUrl = UrlUtils_build(window.location.href);
    enforce = !!currentUrl.searchParams.get("enforce");
  }
  const platform = {
    name: window.lftAndroidVersion ? "android" : window.lftIosVersion ? "ios" : "web",
    version: window.lftAndroidAppVersion || window.lftIosAppVersion,
  };
  const url = UrlUtils_build(`${__API_HOST__}/api/log`);
  try {
    fetch(url.toString(), {
      method: "POST",
      body: JSON.stringify({ user, action, affiliates, platform, subscriptions, key, enforce, referrer }),
      credentials: "include",
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.data.clear) {
          onClear();
        }
      });
  } catch (e) {
    if (Rollbar != null) {
      Rollbar.error("Log failed");
    }
  }
}
