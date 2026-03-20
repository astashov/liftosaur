import React, { createContext, useContext } from "react";
import NativeWebViewPool from "../native/NativeWebViewPool";
import { NativeEventEmitter } from "react-native";
import type { IRNToWebView, IWebViewToRN } from "../bridge/protocol";
import { localdomain } from "../../../src/localdomain";

const WEBVIEW_URL = __DEV__
  ? `https://${localdomain}.liftosaur.com:8080/app/?webviewmode=1`
  : "https://www.liftosaur.com/app/?webviewmode=1";
const INITIAL_POOL_SIZE = 8;

type IOnMessage = (slotId: number, msg: IWebViewToRN) => void;

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
      if (this.onMessageCallback == null) {
        return;
      }
      let msg: IWebViewToRN;
      try {
        msg = JSON.parse(event.data) as IWebViewToRN;
      } catch {
        return;
      }
      this.onMessageCallback(event.slotId, msg);
    });
  }

  public setOnMessage(cb: IOnMessage | null): void {
    this.onMessageCallback = cb;
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
