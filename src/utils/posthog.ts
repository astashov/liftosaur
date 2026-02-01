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
  if (window.gtag) {
    window.gtag("event", args.name || args.googlename, args.extra || {});
  }
  if (window.rdt) {
    window.rdt("track", args.name || args.redditname || "", args.extra || {});
  }
}

export function lg(
  name: string,
  extra?: Record<string, string | number>,
  service?: Service,
  tempUserId?: string
): void {
  tempUserId =
    tempUserId ??
    (typeof globalThis !== "undefined" ? (globalThis as { tempUserId?: string }).tempUserId : undefined) ??
    (typeof window !== "undefined" ? window.tempUserId : undefined);

  if (tempUserId == null) {
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

  service =
    service ?? (typeof window !== "undefined" && window.fetch ? new Service(window.fetch.bind(window)) : undefined);
  if (service == null) {
    return;
  }

  service.postEvent(event).catch((e) => {
    // do nothing;
  });
}
