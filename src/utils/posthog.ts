import { IEventPayload, Service } from "../api/service";
import {
  SendMessage_isIos,
  SendMessage_isAndroid,
  SendMessage_iosAppVersion,
  SendMessage_androidAppVersion,
  SendMessage_toIosAndAndroid,
} from "./sendMessage";

declare let __COMMIT_HASH__: string;

const trackedEvents = new Set<string>();

export function track(args: {
  name?: string;
  redditname?: string;
  googlename?: string;
  extra?: Record<string, string | number>;
}): void {
  if (typeof window === "undefined") {
    return;
  }
  const eventName = args.name || args.googlename || args.redditname || "";
  if (trackedEvents.has(eventName)) {
    return;
  }
  trackedEvents.add(eventName);
  if (window.gtag) {
    window.gtag("event", args.name || args.googlename, args.extra || {});
  }
  if (window.rdt) {
    window.rdt("track", args.name || args.redditname || "", args.extra || {});
  }
}

export function lgDebug(name: string, userId: string, extra?: Record<string, string | number>): void {
  const currentUserId =
    (typeof globalThis !== "undefined" ? (globalThis as { tempUserId?: string }).tempUserId : undefined) ??
    (typeof window !== "undefined" ? window.tempUserId : undefined);
  if (currentUserId === userId) {
    lg(name, extra);
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

  const isMobile = SendMessage_isIos() || SendMessage_isAndroid();

  const event: IEventPayload = {
    type: "event",
    timestamp: Date.now(),
    commithash: typeof __COMMIT_HASH__ !== "undefined" ? __COMMIT_HASH__ : "unknown",
    isMobile,
    iOSVersion: SendMessage_isIos() ? SendMessage_iosAppVersion() : undefined,
    androidVersion: SendMessage_isAndroid() ? SendMessage_androidAppVersion() : undefined,
    name,
    extra,
    userId: tempUserId,
  };

  if (
    (SendMessage_isIos() && SendMessage_iosAppVersion() >= 13) ||
    (SendMessage_isAndroid() && SendMessage_androidAppVersion() >= 22)
  ) {
    SendMessage_toIosAndAndroid({
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
