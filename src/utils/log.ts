import RB from "rollbar";

declare let Rollbar: RB;
declare let __API_HOST__: string;

export namespace LogUtils {
  export async function log(
    user: string,
    action: string,
    affiliates: Partial<Record<string, number>>,
    subscriptions: string[],
    onClear: () => void,
    key?: string
  ): Promise<void> {
    let enforce = false;
    if (typeof window !== "undefined") {
      const currentUrl = new URL(window.location.href);
      enforce = !!currentUrl.searchParams.get("enforce");
    }
    const platform = {
      name: window.lftAndroidVersion ? "android" : window.lftIosVersion ? "ios" : "web",
      version: window.lftAndroidAppVersion || window.lftIosAppVersion,
    };
    const url = new URL(`${__API_HOST__}/api/log`);
    try {
      fetch(url.toString(), {
        method: "POST",
        body: JSON.stringify({ user, action, affiliates, platform, subscriptions, key, enforce }),
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
}
