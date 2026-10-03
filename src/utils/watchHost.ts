// The watch runs watch-bundle.js in QuickJS. JSContext.swift installs these globals so the bundle can
// post messages to WatchMessageHandler.swift. They exist nowhere else.
declare global {
  // eslint-disable-next-line no-var
  var webkit:
    | {
        messageHandlers?: { liftosaurMessage?: { postMessage: (message: Record<string, string | undefined>) => void } };
      }
    | undefined;
  // eslint-disable-next-line no-var
  var lftIosAppVersion: string | undefined;
}

export function WatchHost_isAvailable(): boolean {
  return globalThis.webkit?.messageHandlers?.liftosaurMessage != null;
}

export function WatchHost_appVersion(): number {
  return parseInt(globalThis.lftIosAppVersion || "0", 10);
}

export function WatchHost_send(message: Record<string, string | undefined>): void {
  globalThis.webkit?.messageHandlers?.liftosaurMessage?.postMessage(message);
}
