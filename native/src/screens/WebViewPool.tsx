import React, { createContext, useContext } from "react";
import NativeWebViewPool from "../native/NativeWebViewPool";
import { NativeEventEmitter } from "react-native";
import type { IRNToWebView, IWebViewToRN } from "../bridge/protocol";
import { localdomain } from "../../../src/localdomain";
import { NativeStorageRN } from "../store/NativeStorageRN";

const WEBVIEW_URL = __DEV__
  ? `https://${localdomain}.liftosaur.com:8080/app/?webviewmode=1`
  : "https://www.liftosaur.com/app/?webviewmode=1";
const INITIAL_POOL_SIZE = 0;

type IOnMessage = (slotId: number, msg: IWebViewToRN) => void;
type IOnStorageUpdated = () => void;

const storageRN = new NativeStorageRN();
let onStorageUpdatedCallback: IOnStorageUpdated | null = null;
let storageUpdateTimer: ReturnType<typeof setTimeout> | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isStorageMessage(msg: any): boolean {
  return typeof msg.type === "string" && msg.type.startsWith("storage");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleStorageMessage(slotId: number, msg: any): Promise<void> {
  const t0 = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let response: any;
  switch (msg.type) {
    case "storageGet": {
      const value = await storageRN.get(msg.key);
      console.log(`[PERF] storageGet(${msg.key}): ${Date.now() - t0}ms`);
      response = { type: "storageGetResult", key: msg.key, requestId: msg.requestId, value: value ?? null };
      break;
    }
    case "storageSet": {
      const valueSize = typeof msg.value === "string" ? msg.value.length : 0;
      const success = await storageRN.set(msg.key, msg.value);
      console.log(`[PERF] storageSet(${msg.key}): ${Date.now() - t0}ms, size=${(valueSize / 1024).toFixed(0)}kb`);
      response = { type: "storageSetResult", key: msg.key, requestId: msg.requestId, success };
      if (success && typeof msg.key === "string" && msg.key.startsWith("liftosaur_")) {
        if (storageUpdateTimer != null) {
          clearTimeout(storageUpdateTimer);
        }
        storageUpdateTimer = setTimeout(() => {
          storageUpdateTimer = undefined;
          onStorageUpdatedCallback?.();
        }, 500);
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
      const t0 = Date.now();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let msg: any;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.type === "__console") {
        const level = msg.level === "warn" ? "warn" : msg.level === "error" ? "error" : "log";
        console[level](`[WebView:${event.slotId}]`, msg.message);
        return;
      }
      if (isStorageMessage(msg)) {
        const t0Storage = Date.now();
        handleStorageMessage(event.slotId, msg).then(() => {
          console.log(`[PERF] handleStorageMessage(${msg.type}, ${msg.key ?? ""}): ${Date.now() - t0Storage}ms`);
        });
        return;
      }
      console.log(`[PERF] onWebViewMessage type=${msg.type}: parse=${Date.now() - t0}ms`);
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

  public async sendCommand(command: IRNToWebView): Promise<void> {
    const slotId = await this.acquire();
    const js = `window.__receiveFromRN && window.__receiveFromRN(${JSON.stringify(JSON.stringify(command))});true;`;
    NativeWebViewPool.injectJavaScript(slotId, js);
    this.release(slotId);
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
    const t0 = Date.now();
    return new Promise<void>((resolve) => {
      const msg: IRNToWebView = { type: "init", screen, state: stateJson };
      const js = `window.__receiveFromRN && window.__receiveFromRN(${JSON.stringify(JSON.stringify(msg))});true;`;
      console.log(
        `[PERF] injectScreen(${screen}): stateSize=${(stateJson.length / 1024).toFixed(0)}kb, jsSize=${(js.length / 1024).toFixed(0)}kb`
      );
      NativeWebViewPool.injectJavaScript(slotId, js);
      setTimeout(() => {
        console.log(`[PERF] injectScreen(${screen}) resolved after: ${Date.now() - t0}ms`);
        resolve();
      }, 100);
    });
  }

  public async prepareScreen(screen: string, stateJson: string): Promise<number> {
    const t0 = Date.now();
    const slotId = await this.acquire();
    const acquireMs = Date.now() - t0;
    await this.injectScreen(slotId, screen, stateJson);
    console.log(`[PERF] prepareScreen(${screen}): acquire=${acquireMs}ms, total=${Date.now() - t0}ms`);
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
