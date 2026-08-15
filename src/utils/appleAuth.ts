import { Platform } from "react-native";

declare let __HOST__: string;

export type IAppleAuthResult =
  | { type: "success"; id_token: string; code: string }
  | { type: "cancelled" }
  | { type: "error"; error: string };

type IAppleAuthSdk = NonNullable<Window["AppleID"]>["auth"];

const mountSdkWaitMs = 10000;
// Browsers drop transient user activation ~5s after the click, and signIn() opens a popup, so waiting
// out the full mount-time budget here would just trade the init error for a blocked popup. Bailing early
// instead means the retry succeeds — by then the mount-time wait has init'ed the SDK.
const clickSdkWaitMs = 2000;
const sdkPollIntervalMs = 50;

const cancelErrorCodes = ["popup_closed_by_user", "user_cancelled_authorize", "user_trigger_new_signin_flow"];

// appleid.auth.js is loaded with `async`, so it may land after the account screen mounts. Polling instead of
// checking once means a slow script (common in Firefox, which rarely serves it from a warm cache) still gets
// init'ed rather than silently leaving signIn() to throw 'The "init" function must be called first.'
async function waitForSdk(timeoutMs: number): Promise<IAppleAuthSdk | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (window.AppleID?.auth == null) {
    if (Date.now() > deadline) {
      return undefined;
    }
    await new Promise((resolve) => setTimeout(resolve, sdkPollIntervalMs));
  }
  return window.AppleID.auth;
}

export async function AppleAuth_init(timeoutMs: number = mountSdkWaitMs): Promise<boolean> {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return false;
  }
  const auth = await waitForSdk(timeoutMs);
  if (auth == null) {
    return false;
  }
  auth.init({
    clientId: "com.liftosaur.www.signinapple",
    scope: "email",
    redirectURI: `${__HOST__}/appleauthcallback.html`,
    usePopup: true,
  });
  return true;
}

export async function AppleAuth_signIn(): Promise<IAppleAuthResult> {
  // When the SDK is already loaded this resolves without yielding to the event loop, so the popup opened by
  // signIn() still runs under the click's transient user activation and isn't blocked.
  const isInitialized = await AppleAuth_init(clickSdkWaitMs);
  if (!isInitialized || window.AppleID?.auth == null) {
    return { type: "error", error: "Apple Sign In is still loading. Please try again in a moment." };
  }
  try {
    const response = await window.AppleID.auth.signIn();
    const { id_token, code } = response.authorization;
    if (id_token == null || code == null) {
      return { type: "error", error: "Apple Sign In didn't return the credentials" };
    }
    return { type: "success", id_token, code };
  } catch (e) {
    const error = e as { error?: string } | undefined;
    if (error?.error != null && cancelErrorCodes.indexOf(error.error) !== -1) {
      return { type: "cancelled" };
    }
    return { type: "error", error: "Couldn't sign in with Apple. Please try again." };
  }
}
