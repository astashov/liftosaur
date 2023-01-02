declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Window {
    JSAndroidBridge?: {
      sendMessage: (message: string) => void;
    };
    webkit?: {
      messageHandlers?: {
        liftosaurMessage?: {
          postMessage: (message: Record<string, string>) => void;
        };
      };
    };
  }
}

export namespace SendMessage {
  export function isIos(): boolean {
    return !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.liftosaurMessage);
  }

  export function toIos(obj: Record<string, string>): boolean {
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.liftosaurMessage) {
      window.webkit.messageHandlers.liftosaurMessage.postMessage(obj);
      return true;
    } else {
      return false;
    }
  }

  export function toAndroid(obj: Record<string, string>): boolean {
    if (window.JSAndroidBridge) {
      window.JSAndroidBridge.sendMessage(JSON.stringify(obj));
      return true;
    } else {
      return false;
    }
  }
}
