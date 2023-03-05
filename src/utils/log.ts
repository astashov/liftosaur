import RB from "rollbar";

declare let Rollbar: RB;
declare let __API_HOST__: string;

export namespace LogUtils {
  export async function log(
    user: string,
    action: string,
    affiliates: Partial<Record<string, number>>,
    subscriptions: ("apple" | "google")[]
  ): Promise<void> {
    const platform = {
      name: window.lftAndroidVersion ? "android" : window.lftIosVersion ? "ios" : "web",
      version: window.lftAndroidAppVersion || window.lftIosAppVersion,
    };
    const url = new URL(`${__API_HOST__}/api/log`);
    try {
      fetch(url.toString(), {
        method: "POST",
        body: JSON.stringify({ user, action, affiliates, platform, subscriptions }),
        credentials: "include",
      });
    } catch (e) {
      if (Rollbar != null) {
        Rollbar.error("Log failed");
      }
    }
  }
}
