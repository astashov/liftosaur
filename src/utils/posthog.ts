import { IEventPayload, Service } from "../api/service";
import { SendMessage } from "./sendMessage";

declare let __COMMIT_HASH__: string;

export function track(args: {
  name?: string;
  redditname?: string;
  googlename?: string;
  extra?: Record<string, string | number>;
}): void {
  if (typeof window === "undefined") {
    return;
  }
  window.gtag("event", args.name || args.googlename, args.extra || {});
  window.rdt("track", args.name || args.redditname || "", args.extra || {});
}

export function lg(
  name: string,
  extra?: Record<string, string | number>,
  service?: Service,
  tempUserId?: string
): void {
  service = service ?? (typeof window !== "undefined" ? new Service(window.fetch.bind(window)) : undefined);
  tempUserId = tempUserId ?? (typeof window !== "undefined" ? window.tempUserId : undefined);
  if (service == null || tempUserId == null) {
    return;
  }

  const isMobile = SendMessage.isIos() || SendMessage.isAndroid();

  const event: IEventPayload = {
    type: "event",
    timestamp: Date.now(),
    commithash: typeof __COMMIT_HASH__ !== "undefined" ? __COMMIT_HASH__ : "unknown",
    isMobile,
    iOSVersion: SendMessage.isIos() ? SendMessage.iosAppVersion() : undefined,
    androidVersion: SendMessage.isAndroid() ? SendMessage.androidAppVersion() : undefined,
    name,
    extra,
    userId: tempUserId,
  };

  if (
    (SendMessage.isIos() && SendMessage.iosAppVersion() >= 13) ||
    (SendMessage.isAndroid() && SendMessage.androidAppVersion() >= 22)
  ) {
    SendMessage.toIosAndAndroid({
      type: "event",
      data: JSON.stringify(event),
      commithash: event.commithash,
      userId: event.userId,
    });
    return;
  }

  service.postEvent(event).catch((e) => {
    // do nothing;
  });
}
