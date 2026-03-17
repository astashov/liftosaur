import React, { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import WebView from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";
import type { IWebViewToRN, IRNToWebView } from "../bridge/protocol";

let globalWebViewRef: WebView | null = null;
let isReady = false;
let pendingInit: IRNToWebView | null = null;

export function PersistentWebView_injectScreen(screen: string, stateJson: string): void {
  const msg: IRNToWebView = { type: "init", screen, state: stateJson };
  if (!isReady || globalWebViewRef == null) {
    pendingInit = msg;
    return;
  }
  PersistentWebView_sendMessage(msg);
}

export function PersistentWebView_sendState(stateJson: string): void {
  PersistentWebView_sendMessage({ type: "stateUpdate", state: stateJson });
}

function PersistentWebView_sendMessage(msg: IRNToWebView): void {
  if (globalWebViewRef == null) {
    return;
  }
  const js = `window.__receiveFromRN && window.__receiveFromRN(${JSON.stringify(JSON.stringify(msg))});true;`;
  globalWebViewRef.injectJavaScript(js);
}

const WEBVIEW_SOURCE = { uri: "https://local.liftosaur.com:8080/app/?webviewmode=1" };

interface IProps {
  visible: boolean;
  onMessage: (msg: IWebViewToRN) => void;
}

export function PersistentWebView({ visible, onMessage }: IProps): React.ReactElement {
  const webViewRef = useRef<WebView>(null);

  const handleRef = useCallback((ref: WebView | null) => {
    globalWebViewRef = ref;
    (webViewRef as React.MutableRefObject<WebView | null>).current = ref;
  }, []);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let msg: IWebViewToRN;
      try {
        msg = JSON.parse(event.nativeEvent.data) as IWebViewToRN;
      } catch {
        return;
      }

      if (msg.type === "ready") {
        isReady = true;
        if (pendingInit != null) {
          PersistentWebView_sendMessage(pendingInit);
          pendingInit = null;
        }
      }

      onMessage(msg);
    },
    [onMessage]
  );

  return (
    <View style={[styles.container, !visible && styles.hidden]} pointerEvents={visible ? "auto" : "none"}>
      <WebView
        ref={handleRef}
        source={WEBVIEW_SOURCE}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        originWhitelist={["*"]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hidden: {
    position: "absolute",
    width: 0,
    height: 0,
    overflow: "hidden",
  },
  webview: {
    flex: 1,
  },
});
