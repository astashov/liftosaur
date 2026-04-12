import RB from "rollbar";
import { Platform } from "react-native";
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
  const platform = {
    name: Platform.OS,
    version: "RN",
  };
  const url = UrlUtils_build(`${__API_HOST__}/api/log`);
  try {
    fetch(url.toString(), {
      method: "POST",
      body: JSON.stringify({ user, action, affiliates, platform, subscriptions, key, referrer }),
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
