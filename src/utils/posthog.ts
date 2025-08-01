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

  if (SendMessage.isIos() && SendMessage.iosAppVersion() >= 13) {
    const event: IEventPayload = {
      type: "event",
      timestamp: Date.now(),
      commithash: typeof __COMMIT_HASH__ !== "undefined" ? __COMMIT_HASH__ : "unknown",
      isMobile: true,
      name,
      extra,
      userId: tempUserId,
    };
    SendMessage.toIos({ type: "event", data: JSON.stringify(event) });
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
