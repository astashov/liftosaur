import React, { createContext, useContext } from "react";
import NativeWebViewPool from "../native/NativeWebViewPool";
import { NativeEventEmitter } from "react-native";
import type { IRNToWebView, IWebViewToRN } from "../bridge/protocol";
import { localdomain } from "../../../src/localdomain";
import { NativeStorageRN } from "../store/NativeStorageRN";

const WEBVIEW_URL = __DEV__
  ? `https://${localdomain}.liftosaur.com:8080/app/?webviewmode=1`
  : "https://www.liftosaur.com/app/?webviewmode=1";
const INITIAL_POOL_SIZE = 8;

type IOnMessage = (slotId: number, msg: IWebViewToRN) => void;
type IOnStorageUpdated = () => void;

const storageRN = new NativeStorageRN();
let onStorageUpdatedCallback: IOnStorageUpdated | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isStorageMessage(msg: any): boolean {
  return typeof msg.type === "string" && msg.type.startsWith("storage");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleStorageMessage(slotId: number, msg: any): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let response: any;
  switch (msg.type) {
    case "storageGet": {
      const value = await storageRN.get(msg.key);
      response = { type: "storageGetResult", key: msg.key, requestId: msg.requestId, value: value ?? null };
      break;
    }
    case "storageSet": {
      const success = await storageRN.set(msg.key, msg.value);
      response = { type: "storageSetResult", key: msg.key, requestId: msg.requestId, success };
      if (success && typeof msg.key === "string" && msg.key.startsWith("liftosaur_")) {
        onStorageUpdatedCallback?.();
      }
      break;
    }
    case "storageDelete": {
      const success = await storageRN.delete(msg.key);
      response = { type: "storageDeleteResult", key: msg.key, requestId: msg.requestId, success };
      break;
    }
    case "storageHas": {
      const exists = await storageRN.has(msg.key);
      response = { type: "storageHasResult", key: msg.key, requestId: msg.requestId, exists };
      break;
    }
    case "storageGetAllKeys": {
      const keys = await storageRN.getAllKeys();
      response = { type: "storageGetAllKeysResult", requestId: msg.requestId, keys };
      break;
    }
    default:
      return;
  }
  const js = `window.postMessage(${JSON.stringify(response)}, "*");true;`;
  NativeWebViewPool.injectJavaScript(slotId, js);
}

class WebViewPool {
  private readonly preparedSlots: Map<string, number> = new Map();
  private onMessageCallback: IOnMessage | null = null;
  private initialized = false;

  public initialize(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    NativeWebViewPool.setup(WEBVIEW_URL, INITIAL_POOL_SIZE);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emitter = new NativeEventEmitter(NativeWebViewPool as any);
    emitter.addListener("onWebViewMessage", (event: { slotId: number; data: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let msg: any;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (isStorageMessage(msg)) {
        handleStorageMessage(event.slotId, msg);
        return;
      }
      if (this.onMessageCallback != null) {
        this.onMessageCallback(event.slotId, msg as IWebViewToRN);
      }
    });
  }

  public setOnMessage(cb: IOnMessage | null): void {
    this.onMessageCallback = cb;
  }

  public setOnStorageUpdated(cb: IOnStorageUpdated | null): void {
    onStorageUpdatedCallback = cb;
  }

  public claimPrepared(screenName: string): number | undefined {
    const slotId = this.preparedSlots.get(screenName);
    if (slotId != null) {
      this.preparedSlots.delete(screenName);
      return slotId;
    }
    return undefined;
  }

  public async prepareInitialScreens(screens: string[], stateJson: string): Promise<void> {
    await Promise.all(
      screens.map(async (screen) => {
        const slotId = await this.acquire();
        await this.injectScreen(slotId, screen, stateJson);
        this.preparedSlots.set(screen, slotId);
        console.log(`[Pool] pre-prepared ${screen} in slot ${slotId}`);
      })
    );
  }

  public acquire(): Promise<number> {
    return NativeWebViewPool.acquire();
  }

  public release(slotId: number): void {
    NativeWebViewPool.releaseSlot(slotId);
  }

  public attach(slotId: number, targetNativeID: string): Promise<boolean> {
    return NativeWebViewPool.attach(slotId, targetNativeID);
  }

  public injectScreen(slotId: number, screen: string, stateJson: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const msg: IRNToWebView = { type: "init", screen, state: stateJson };
      const js = `window.__receiveFromRN && window.__receiveFromRN(${JSON.stringify(JSON.stringify(msg))});true;`;
      NativeWebViewPool.injectJavaScript(slotId, js);
      setTimeout(resolve, 100);
    });
  }

  public async prepareScreen(screen: string, stateJson: string): Promise<number> {
    const slotId = await this.acquire();
    await this.injectScreen(slotId, screen, stateJson);
    return slotId;
  }
}

export { WebViewPool };

const WebViewPoolContext = createContext<WebViewPool | null>(null);

export const WebViewPoolProvider = WebViewPoolContext.Provider;

export function useWebViewPool(): WebViewPool {
  const pool = useContext(WebViewPoolContext);
  if (pool == null) {
    throw new Error("useWebViewPool must be used within a WebViewPoolProvider");
  }
  return pool;
}
