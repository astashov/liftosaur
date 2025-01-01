import { useNavigation } from "@react-navigation/native";
import React, { JSX, useContext } from "react";
import { View } from "react-native";
import { IDispatch } from "../../src/ducks/types";
import { DefaultPropsContext } from "./app2";
import { ScreenView } from "../../src/components/screen";

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
      <ScreenView state={state} dispatch={augmentedDispatch} />
    </View>
  );
};
