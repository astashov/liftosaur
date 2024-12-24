declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Window {
    JSAndroidBridge?: {
      sendMessage: (message: string) => void;
    };
    webkit?: {
      messageHandlers?: {
        liftosaurMessage?: {
          postMessage: (message: Record<string, string | undefined>) => void;
        };
      };
    };
  }
}

let receiveMessage: ((event: MessageEvent) => void) | undefined;

export namespace SendMessage {
  export function iosAppVersion(): number {
    return parseInt(window.lftIosAppVersion || "0", 10);
  }

  export function iosVersion(): number {
    return parseInt(window.lftIosVersion || "0", 10);
  }

  export function androidAppVersion(): number {
    return parseInt(window.lftAndroidAppVersion || "0", 10);
  }

  export function androidVersion(): number {
    return parseInt(window.lftAndroidVersion?.toString() || "0", 10);
  }

  export function isIosOrAndroid(): boolean {
    return isIos() || isAndroid();
  }

  export function isIos(): boolean {
    return (
      typeof window !== "undefined" &&
      !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.liftosaurMessage)
    );
  }

  export function toIosWithResult<T>(obj: Record<string, string | undefined>): Promise<T | undefined> {
    if (!SendMessage.isIos()) {
      return Promise.resolve(undefined);
    }
    return new Promise((resolve) => {
      toIos(obj);
      if (receiveMessage != null) {
        window.removeEventListener("message", receiveMessage);
      }
      receiveMessage = (event) => {
        if (event.data?.type === "iosResponse") {
          if (receiveMessage != null) {
            window.removeEventListener("message", receiveMessage);
            receiveMessage = undefined;
          }
          resolve(event.data);
        }
      };
      window.addEventListener("message", receiveMessage);
    });
  }

  export function toAndroidWithResult<T>(obj: Record<string, string | undefined>): Promise<T | undefined> {
    if (!SendMessage.isAndroid()) {
      return Promise.resolve(undefined);
    }
    return new Promise((resolve) => {
      toAndroid(obj);
      if (receiveMessage != null) {
        window.removeEventListener("message", receiveMessage);
      }
      receiveMessage = (event) => {
        if (event.data?.type === "androidResponse") {
          if (receiveMessage != null) {
            window.removeEventListener("message", receiveMessage);
            receiveMessage = undefined;
          }
          resolve(event.data);
        }
      };
      window.addEventListener("message", receiveMessage);
    });
  }

  export function toIosAndAndroid(obj: Record<string, string | undefined>): boolean {
    const toIosResult = toIos(obj);
    const toAndroidResult = toAndroid(obj);
    return toIosResult || toAndroidResult;
  }

  export function toIosAndAndroidWithResult<T>(obj: Record<string, string | undefined>): Promise<T | undefined> {
    if (SendMessage.isIos()) {
      return toIosWithResult(obj);
    } else if (SendMessage.isAndroid()) {
      return toAndroidWithResult(obj);
    } else {
      return Promise.resolve(undefined);
    }
  }

  export function toIos(obj: Record<string, string | undefined>): boolean {
    if (
      typeof window !== "undefined" &&
      window.webkit &&
      window.webkit.messageHandlers &&
      window.webkit.messageHandlers.liftosaurMessage
    ) {
      window.webkit.messageHandlers.liftosaurMessage.postMessage(obj);
      return true;
    } else {
      return false;
    }
  }

  export function toAndroid(obj: Record<string, string | undefined>): boolean {
    if (typeof window !== "undefined" && window.JSAndroidBridge) {
      window.JSAndroidBridge.sendMessage(JSON.stringify(obj));
      return true;
    } else {
      return false;
    }
  }

  export function isAndroid(): boolean {
    return typeof window !== "undefined" && !!window.JSAndroidBridge;
  }
}
