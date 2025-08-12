import { IEventPayload, Service } from "../api/service";
import { SendMessage } from "./sendMessage";

declare let __COMMIT_HASH__: string;

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

  if (
    (SendMessage.isIos() && SendMessage.iosAppVersion() >= 13) ||
    (SendMessage.isAndroid() && SendMessage.androidAppVersion() >= 22)
  ) {
    const event: IEventPayload = {
      type: "event",
      timestamp: Date.now(),
      commithash: typeof __COMMIT_HASH__ !== "undefined" ? __COMMIT_HASH__ : "unknown",
      isMobile: true,
      name,
      extra,
      userId: tempUserId,
    };
    SendMessage.toIosAndAndroid({
      type: "event",
      data: JSON.stringify(event),
      commithash: event.commithash,
      userId: event.userId,
    });
    return;
  }

  service
    .postEvent({
      type: "event",
      timestamp: Date.now(),
      commithash: typeof __COMMIT_HASH__ !== "undefined" ? __COMMIT_HASH__ : "unknown",
      name,
      extra,
      userId: tempUserId,
    })
    .catch((e) => {
      // do nothing;
    });
}
