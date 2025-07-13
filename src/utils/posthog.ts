import { Service } from "../api/service";

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

  service
    .postEvent({
      type: "event",
      timestamp: Date.now(),
      commithash: __COMMIT_HASH__,
      name,
      extra,
      userId: tempUserId,
    })
    .catch((e) => {
      // do nothing;
    });
}
