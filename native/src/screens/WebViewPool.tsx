import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import WebView from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";
import type { IRNToWebView, IWebViewToRN } from "../bridge/protocol";
import NativeWebViewReparenter from "../native/NativeWebViewReparenter";

const WEBVIEW_SOURCE = { uri: "https://local.liftosaur.com:8080/app/?webviewmode=1" };
const INITIAL_POOL_SIZE = 8;
const POOL_CONTAINER_ID = "webview-pool-container";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function WebViewPool_slotNativeID(slotId: number): string {
  return `webview-slot-${slotId}`;
}

interface ISlot {
  id: number;
  ref: WebView | null;
  status: "loading" | "idle" | "assigned";
  assignedTo?: string;
}

type IOnMessage = (slotId: number, msg: IWebViewToRN) => void;

let globalPool: ISlot[] = [];
let onMessageCallback: IOnMessage | null = null;
const onReadyCallbacks: Map<number, () => void> = new Map();
const acquireWaiters: Array<(slotId: number) => void> = [];
const preparedSlots: Map<string, number> = new Map();
let expandPool: (() => void) | null = null;

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
      const slotId = await WebViewPool_acquire(`prepared-${screen}`);
      await WebViewPool_injectScreen(slotId, screen, stateJson);
      preparedSlots.set(screen, slotId);
      console.log(`[Pool] pre-prepared ${screen} in slot ${slotId}`);
    })
  );
}

function WebViewPool_idleCount(): number {
  return globalPool.filter((s) => s.status === "idle").length;
}

function WebViewPool_ensureSpare(): void {
  if (WebViewPool_idleCount() <= 1 && expandPool != null) {
    console.log(`[Pool] only ${WebViewPool_idleCount()} idle slots left, expanding`);
    expandPool();
  }
}

export function WebViewPool_acquire(screenKey: string): Promise<number> {
  const slot = globalPool.find((s) => s.status === "idle");
  if (slot != null) {
    slot.status = "assigned";
    slot.assignedTo = screenKey;
    WebViewPool_ensureSpare();
    return Promise.resolve(slot.id);
  }
  if (expandPool != null) {
    expandPool();
  }
  return new Promise<number>((resolve) => {
    acquireWaiters.push((slotId) => {
      const s = globalPool.find((sl) => sl.id === slotId);
      if (s != null) {
        s.status = "assigned";
        s.assignedTo = screenKey;
      }
      WebViewPool_ensureSpare();
      resolve(slotId);
    });
  });
}

function WebViewPool_notifyWaiters(): void {
  while (acquireWaiters.length > 0) {
    const slot = globalPool.find((s) => s.status === "idle");
    if (slot == null) {
      break;
    }
    const waiter = acquireWaiters.shift()!;
    waiter(slot.id);
  }
}

export function WebViewPool_release(slotId: number): void {
  const slot = globalPool.find((s) => s.id === slotId);
  if (slot == null) {
    return;
  }
  slot.status = "idle";
  slot.assignedTo = undefined;
  NativeWebViewReparenter.reparent(WebViewPool_slotNativeID(slotId), POOL_CONTAINER_ID);
  WebViewPool_notifyWaiters();
}

export async function WebViewPool_prepareScreen(screenKey: string, screen: string, stateJson: string): Promise<number> {
  const slotId = await WebViewPool_acquire(screenKey);
  await WebViewPool_injectScreen(slotId, screen, stateJson);
  return slotId;
}

export async function WebViewPool_reparentTo(slotId: number, targetNativeID: string): Promise<boolean> {
  return NativeWebViewReparenter.reparent(WebViewPool_slotNativeID(slotId), targetNativeID);
}

export function WebViewPool_injectScreen(slotId: number, screen: string, stateJson: string): Promise<void> {
  return new Promise<void>((resolve) => {
    const slot = globalPool.find((s) => s.id === slotId);
    if (slot?.ref == null) {
      resolve();
      return;
    }
    const msg: IRNToWebView = { type: "init", screen, state: stateJson };
    const js = `window.__receiveFromRN && window.__receiveFromRN(${JSON.stringify(JSON.stringify(msg))});true;`;
    onReadyCallbacks.set(slotId, resolve);
    slot.ref.injectJavaScript(js);
    setTimeout(resolve, 300);
  });
}

export function WebViewPool_sendState(slotId: number, stateJson: string): void {
  const slot = globalPool.find((s) => s.id === slotId);
  if (slot?.ref == null) {
    return;
  }
  const msg: IRNToWebView = { type: "stateUpdate", state: stateJson };
  const js = `window.__receiveFromRN && window.__receiveFromRN(${JSON.stringify(JSON.stringify(msg))});true;`;
  slot.ref.injectJavaScript(js);
}

interface IPoolProps {
  onMessage: IOnMessage;
}

export function WebViewPoolProvider({ onMessage }: IPoolProps): React.ReactElement {
  const [slots, setSlots] = useState<ISlot[]>(() => {
    const s = Array.from({ length: INITIAL_POOL_SIZE }, (_, i) => ({
      id: i,
      ref: null as WebView | null,
      status: "loading" as const,
    }));
    globalPool = s;
    return s;
  });

  useEffect(() => {
    expandPool = () => {
      setSlots((prev) => {
        const newId = prev.length;
        const newSlot: ISlot = { id: newId, ref: null, status: "loading" };
        globalPool = [...prev, newSlot];
        console.log(`[Pool] expanded to ${newId + 1} slots`);
        return globalPool;
      });
    };
    return () => {
      expandPool = null;
    };
  }, []);

  useEffect(() => {
    onMessageCallback = onMessage;
    return () => {
      onMessageCallback = null;
    };
  }, [onMessage]);

  return (
    <View nativeID={POOL_CONTAINER_ID} style={styles.poolContainer} pointerEvents="none">
      {slots.map((slot) => (
        <WebViewPoolSlot key={slot.id} slot={slot} />
      ))}
    </View>
  );
}

function WebViewPoolSlot({ slot }: { slot: ISlot }): React.ReactElement {
  const handleRef = useCallback(
    (ref: WebView | null) => {
      slot.ref = ref;
    },
    [slot]
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let msg: IWebViewToRN;
      try {
        msg = JSON.parse(event.nativeEvent.data) as IWebViewToRN;
      } catch {
        return;
      }

      if (msg.type === "ready" || msg.type === "rendered") {
        if (msg.type === "ready") {
          slot.status = "idle";
          WebViewPool_notifyWaiters();
        }
        const cb = onReadyCallbacks.get(slot.id);
        if (cb != null) {
          onReadyCallbacks.delete(slot.id);
          cb();
        }
      }

      if (onMessageCallback != null) {
        onMessageCallback(slot.id, msg);
      }
    },
    [slot]
  );

  const handleLoadEnd = useCallback(() => {
    console.log(`[Pool] slot ${slot.id} loadEnd, status was ${slot.status}`);
    if (slot.status === "loading") {
      slot.status = "idle";
      WebViewPool_notifyWaiters();
    }
  }, [slot]);

  return (
    <View nativeID={WebViewPool_slotNativeID(slot.id)} style={styles.webViewWrapper}>
      <WebView
        ref={handleRef}
        source={WEBVIEW_SOURCE}
        style={styles.webView}
        onMessage={handleMessage}
        onLoadEnd={handleLoadEnd}
        javaScriptEnabled
        originWhitelist={["*"]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  poolContainer: {
    position: "absolute",
    left: -SCREEN_WIDTH,
    top: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  webViewWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  webView: {
    flex: 1,
  },
});
