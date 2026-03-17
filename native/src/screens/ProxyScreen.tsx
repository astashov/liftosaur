import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { MigratedScreens_get } from "../navigation/migratedScreens";
import { PersistentWebView_injectScreen } from "./WebViewScreen";
import { useStoreState } from "../context/StoreContext";
import type { IScreenName } from "../navigation/screenMap";
import { useIsFocused } from "@react-navigation/native";

interface IProps {
  route: { name: string; params?: unknown };
}

export function ProxyScreen({ route }: IProps): React.ReactElement {
  const screenName = route.name as IScreenName;
  const NativeComponent = MigratedScreens_get(screenName);
  const state = useStoreState();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (NativeComponent != null || !isFocused) {
      return;
    }
    PersistentWebView_injectScreen(screenName, JSON.stringify(state));
  }, [screenName, isFocused, NativeComponent, state]);

  if (NativeComponent != null) {
    return <NativeComponent route={route} />;
  }

  return <View style={styles.transparent} />;
}

const styles = StyleSheet.create({
  transparent: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
