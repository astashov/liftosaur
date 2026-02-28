import { SendMessage_isIos, SendMessage_toIos, SendMessage_isAndroid, SendMessage_toAndroid } from "./sendMessage";
import { UrlUtils_build } from "./url";

declare let __HOST__: string;

let windowRef: Window | null = null;
let windowUrl: string | undefined;
let receiveMessage: ((event: MessageEvent) => void) | undefined;

export function getGoogleAccessToken(): Promise<string | undefined> {
  return new Promise((resolve) => {
    const urlBuilder = UrlUtils_build("https://accounts.google.com/o/oauth2/v2/auth");
    urlBuilder.searchParams.append("scope", "openid email");
    urlBuilder.searchParams.append("include_granted_scopes", "true");
    urlBuilder.searchParams.append("response_type", "token");
    urlBuilder.searchParams.append("redirect_uri", `${__HOST__}/googleauthcallback.html`);
    urlBuilder.searchParams.append(
      "client_id",
      "944666871420-p8kv124sgte8o0p6ev2ah6npudsl7e4f.apps.googleusercontent.com"
    );
    const url = urlBuilder.toString();

    if (receiveMessage != null) {
      window.removeEventListener("message", receiveMessage);
    }

    const windowOpts = "toolbar=no, menubar=no, width=600, height=700, top=100, left=100";

    if (SendMessage_isIos()) {
      SendMessage_toIos({ type: "signInWithGoogle" });
    } else if (SendMessage_isAndroid()) {
      SendMessage_toAndroid({ type: "signInWithGoogle" });
    } else {
      if (windowRef == null || windowRef.closed) {
        windowRef = window.open(url, "google-auth", windowOpts);
      } else if (windowUrl !== url) {
        windowRef = window.open(url, "google-auth", windowOpts);
        if (windowRef != null) {
          windowRef.focus();
        }
      } else {
        windowRef.focus();
      }
    }

    receiveMessage = (event) => {
      const data = event.data;
      if (typeof data !== "string") {
        return;
      }
      if (!data.startsWith("http://") && !data.startsWith("https://")) {
        return;
      }
      const callbackUrl = UrlUtils_build(data);
      const params = callbackUrl.hash.slice(1);
      const exUrl = UrlUtils_build("https://www.example.com");
      exUrl.search = params;
      const accessToken = exUrl.searchParams.get("access_token")!;
      resolve(accessToken);
    };
    window.addEventListener("message", receiveMessage);
    windowUrl = url;
  });
}
