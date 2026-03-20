import NativeWebViewPool from "../native/NativeWebViewPool";
import { NativeEventEmitter } from "react-native";
import type { IRNToWebView, IWebViewToRN } from "../bridge/protocol";

const WEBVIEW_URL = "https://local.liftosaur.com:8080/app/?webviewmode=1";
const INITIAL_POOL_SIZE = 8;

const preparedSlots: Map<string, number> = new Map();
type IOnMessage = (slotId: number, msg: IWebViewToRN) => void;
let onMessageCallback: IOnMessage | null = null;
let initialized = false;

export function WebViewPool_initialize(): void {
  if (initialized) {
    return;
  }
  initialized = true;
  NativeWebViewPool.setup(WEBVIEW_URL, INITIAL_POOL_SIZE);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emitter = new NativeEventEmitter(NativeWebViewPool as any);
  emitter.addListener("onWebViewMessage", (event: { slotId: number; data: string }) => {
    if (onMessageCallback == null) {
      return;
    }
    let msg: IWebViewToRN;
    try {
      msg = JSON.parse(event.data) as IWebViewToRN;
    } catch {
      return;
    }
    onMessageCallback(event.slotId, msg);
  });
}

export function WebViewPool_setOnMessage(cb: IOnMessage | null): void {
  onMessageCallback = cb;
}

export function WebViewPool_claimPrepared(screenName: string): number | undefined {
  const slotId = preparedSlots.get(screenName);
  if (slotId != null) {
    preparedSlots.delete(screenName);
    return slotId;
  }
  return undefined;
}

export async function WebViewPool_prepareInitialScreens(screens: string[], stateJson: string): Promise<void> {
  await Promise.all(
    screens.map(async (screen) => {
      const slotId = await WebViewPool_acquire();
      await WebViewPool_injectScreen(slotId, screen, stateJson);
      preparedSlots.set(screen, slotId);
      console.log(`[Pool] pre-prepared ${screen} in slot ${slotId}`);
    })
  );
}

export function WebViewPool_acquire(): Promise<number> {
  return NativeWebViewPool.acquire();
}

export function WebViewPool_release(slotId: number): void {
  NativeWebViewPool.releaseSlot(slotId);
}

export function WebViewPool_attach(slotId: number, targetNativeID: string): Promise<boolean> {
  return NativeWebViewPool.attach(slotId, targetNativeID);
}

export function WebViewPool_injectScreen(slotId: number, screen: string, stateJson: string): Promise<void> {
  return new Promise<void>((resolve) => {
    const msg: IRNToWebView = { type: "init", screen, state: stateJson };
    const js = `window.__receiveFromRN && window.__receiveFromRN(${JSON.stringify(JSON.stringify(msg))});true;`;
    NativeWebViewPool.injectJavaScript(slotId, js);
    setTimeout(resolve, 100);
  });
}

export function WebViewPool_sendState(slotId: number, stateJson: string): void {
  const msg: IRNToWebView = { type: "stateUpdate", state: stateJson };
  const js = `window.__receiveFromRN && window.__receiveFromRN(${JSON.stringify(JSON.stringify(msg))});true;`;
  NativeWebViewPool.injectJavaScript(slotId, js);
}

export async function WebViewPool_prepareScreen(
  _screenKey: string,
  screen: string,
  stateJson: string
): Promise<number> {
  const slotId = await WebViewPool_acquire();
  await WebViewPool_injectScreen(slotId, screen, stateJson);
  return slotId;
}
