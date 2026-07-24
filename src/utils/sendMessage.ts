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

export function SendMessage_iosAppVersion(): number {
  return parseInt(window.lftIosAppVersion || "0", 10);
}

export function SendMessage_iosVersion(): number {
  return parseInt(window.lftIosVersion || "0", 10);
}

export function SendMessage_androidAppVersion(): number {
  return parseInt(window.lftAndroidAppVersion || "0", 10);
}

export function SendMessage_print(message: string): void {
  SendMessage_toIosAndAndroid({ type: "print", value: message });
}

export function SendMessage_androidVersion(): number {
  return parseInt(window.lftAndroidVersion?.toString() || "0", 10);
}

export function SendMessage_isIosOrAndroid(): boolean {
  return SendMessage_isIos() || SendMessage_isAndroid();
}

export function SendMessage_isIos(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.liftosaurMessage)
  );
}

export function SendMessage_toIosWithResult<T>(obj: Record<string, string | undefined>): Promise<T | undefined> {
  if (!SendMessage_isIos()) {
    return Promise.resolve(undefined);
  }
  return new Promise((resolve) => {
    SendMessage_toIos(obj);
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

export function SendMessage_toAndroidWithResult<T>(obj: Record<string, string | undefined>): Promise<T | undefined> {
  if (!SendMessage_isAndroid()) {
    return Promise.resolve(undefined);
  }
  return new Promise((resolve) => {
    SendMessage_toAndroid(obj);
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

export function SendMessage_toIosAndAndroid(obj: Record<string, string | undefined>): boolean {
  const toIosResult = SendMessage_toIos(obj);
  const toAndroidResult = SendMessage_toAndroid(obj);
  return toIosResult || toAndroidResult;
}

export function SendMessage_toIosAndAndroidWithResult<T>(
  obj: Record<string, string | undefined>
): Promise<T | undefined> {
  if (SendMessage_isIos()) {
    return SendMessage_toIosWithResult(obj);
  } else if (SendMessage_isAndroid()) {
    return SendMessage_toAndroidWithResult(obj);
  } else {
    return Promise.resolve(undefined);
  }
}

export function SendMessage_toIos(obj: Record<string, string | undefined>): boolean {
  if (
    typeof window !== "undefined" &&
    window.webkit &&
    window.webkit.messageHandlers &&
    window.webkit.messageHandlers.liftosaurMessage
  ) {
    try {
      window.webkit.messageHandlers.liftosaurMessage.postMessage(obj);
      return true;
    } catch (e) {
      console.error("Failed to send message to iOS bridge:", e);
      return false;
    }
  } else {
    return false;
  }
}

export function SendMessage_toAndroid(obj: Record<string, string | undefined>): boolean {
  if (typeof window !== "undefined" && window.JSAndroidBridge) {
    try {
      window.JSAndroidBridge.sendMessage(JSON.stringify(obj));
      return true;
    } catch (e) {
      console.error("Failed to send message to Android bridge:", e);
      return false;
    }
  } else {
    return false;
  }
}

export function SendMessage_isAndroid(): boolean {
  return typeof window !== "undefined" && !!window.JSAndroidBridge;
}
