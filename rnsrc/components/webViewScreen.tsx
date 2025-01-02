import React, { JSX, useEffect, useRef } from "react";
import { useContext } from "react";
import { View } from "react-native";
import WebView from "react-native-webview";
import { DefaultPropsContext } from "./app2";
import { IDispatch } from "../../src/ducks/types";
import { Screen } from "../../src/models/screen";
import { reducer } from "../../src/ducks/reducer";

// Screens
export const WebViewScreen = (): JSX.Element => {
  const { state, dispatch, env } = useContext(DefaultPropsContext);
  console.log("Render webview");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!state || !dispatch || !env) {
    return <View style={{ flex: 1, justifyContent: "center", alignItems: "stretch" }} />;
  }
  const webviewRef = useRef<WebView>(null);

  useEffect(() => {
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript(`if (window.replaceState) {
        window.replaceState(${JSON.stringify(state)})
      } else {
        console.error("No replace state");
      }; true`);
    }
  }, [state]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "stretch" }}>
      <WebView
        ref={webviewRef}
        javaScriptEnabled={true}
        allowsInlineMediaPlayback={true}
        webviewDebuggingEnabled={true}
        injectedJavaScriptBeforeContentLoaded={`window.appState = ${JSON.stringify(state)};`}
        source={{ uri: "https://local.liftosaur.com:8080/screen/" }}
        onMessage={(event) => {
          dispatch(JSON.parse(event.nativeEvent.data));
        }}
        style={{ flex: 1 }}
      />
    </View>
  );
};
