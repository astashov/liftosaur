import React, { JSX, useContext } from "react";
import { View } from "react-native";
import { DefaultPropsContext } from "./app2";
import { ScreenView } from "../../src/components/screen";

// Screens
export const WebViewScreen = (): JSX.Element => {
  const { state, dispatch } = useContext(DefaultPropsContext);
  console.log("Render webview");
  if (!state || !dispatch) {
    return <View style={{ flex: 1, justifyContent: "center", alignItems: "stretch" }} />;
  }
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "stretch" }}>
      <ScreenView state={state} dispatch={dispatch} />
    </View>
  );
};
