import React, { JSX } from "react";
import { useContext } from "react";
import { View } from "react-native";
import WebView from "react-native-webview";
import { DefaultPropsContext } from "./app2";
import { useNavigation } from "@react-navigation/native";
import { IDispatch } from "../../src/ducks/types";
import { Screen } from "../../src/models/screen";

// Screens
export const WebViewScreen = (): JSX.Element => {
  const { state, dispatch } = useContext(DefaultPropsContext);
  console.log("Render webview");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  if (!state || !dispatch) {
    return <View style={{ flex: 1, justifyContent: "center", alignItems: "stretch" }} />;
  }
  const augmentedDispatch: IDispatch = (action) => {
    if (typeof action !== "function" && action.type === "Thunk" && action.name === "pushScreen") {
      navigation.navigate(action.args[0]);
    }
    dispatch(action);
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "stretch" }}>
      <WebView
        key={Screen.current(state.screenStack)}
        javaScriptEnabled={true}
        allowsInlineMediaPlayback={true}
        webviewDebuggingEnabled={true}
        source={{ uri: "https://local.liftosaur.com:8080/screen/" }}
        injectedJavaScriptBeforeContentLoaded={`
      window.appState = ${JSON.stringify(state)};
    `}
        onMessage={(event) => {
          console.log("Received event", event.nativeEvent.data);
          augmentedDispatch(JSON.parse(event.nativeEvent.data));
        }}
        style={{ flex: 1 }}
      />
    </View>
  );
};
