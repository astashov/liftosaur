import React, { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer, useNavigationContainerRef, type NavigationState } from "@react-navigation/native";
import { PersistentWebView, PersistentWebView_injectScreen } from "../screens/WebViewScreen";
import { tabInitialScreen, ScreenMap_hasTabBar, type ITab, type IScreenName } from "./screenMap";
import type { IWebViewToRN } from "../bridge/protocol";
import { useStoreState } from "../context/StoreContext";

const Tab = createBottomTabNavigator();

const tabConfig: Array<{ name: ITab; label: string }> = [
  { name: "home", label: "Home" },
  { name: "program", label: "Program" },
  { name: "workout", label: "Workout" },
  { name: "graphs", label: "Graphs" },
  { name: "me", label: "Me" },
];

function EmptyScreen(): React.ReactElement | null {
  return null;
}

export function AppNavigator(): React.ReactElement {
  const navigationRef = useNavigationContainerRef();
  const appState = useStoreState();
  const [showTabBar, setShowTabBar] = useState(true);

  const handleStateChange = useCallback(
    (navState: NavigationState | undefined) => {
      if (navState == null) {
        return;
      }
      const activeTab = navState.routes[navState.index];
      const tabName = activeTab.name as ITab;
      const screen = tabInitialScreen[tabName];
      setShowTabBar(ScreenMap_hasTabBar(screen));
      PersistentWebView_injectScreen(screen, JSON.stringify(appState));
    },
    [appState]
  );

  const handleWebViewMessage = useCallback(
    (msg: IWebViewToRN) => {
      if (msg.type === "navigate") {
        const screen = msg.screen as IScreenName;
        setShowTabBar(ScreenMap_hasTabBar(screen));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigationRef as any).navigate(msg.screen, msg.params);
      } else if (msg.type === "goBack") {
        navigationRef.goBack();
      }
    },
    [navigationRef]
  );

  return (
    <View style={styles.root}>
      <PersistentWebView visible onMessage={handleWebViewMessage} />
      <View style={[styles.tabBarOverlay, !showTabBar && styles.tabBarHidden]}>
        <NavigationContainer ref={navigationRef} onStateChange={handleStateChange}>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: "#6366f1",
              tabBarInactiveTintColor: "#9ca3af",
            }}
          >
            {tabConfig.map(({ name, label }) => (
              <Tab.Screen key={name} name={name} component={EmptyScreen} options={{ title: label }} />
            ))}
          </Tab.Navigator>
        </NavigationContainer>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabBarOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBarHidden: {
    bottom: -100,
  },
});
