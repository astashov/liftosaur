import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer, StackActions, useNavigationContainerRef } from "@react-navigation/native";
import { PooledWebViewScreen } from "../screens/PooledWebViewScreen";
import {
  WebViewPool_initialize,
  WebViewPool_setOnMessage,
  WebViewPool_prepareInitialScreens,
  WebViewPool_prepareScreen,
} from "../screens/WebViewPool";
import { MigratedScreens_get } from "./migratedScreens";
import {
  tabInitialScreen,
  screenToTab,
  ScreenMap_hasTabBar,
  ScreenMap_tabScreens,
  type ITab,
  type IScreenName,
} from "./screenMap";
import type { IWebViewToRN } from "../bridge/protocol";
import { useStoreState } from "../context/StoreContext";

const Tab = createBottomTabNavigator();

function createTabStack(tab: ITab): () => React.ReactElement {
  const Stack = createNativeStackNavigator();
  const screens = ScreenMap_tabScreens(tab);

  return function TabStack(): React.ReactElement {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {screens.map((screen) => (
          <Stack.Screen
            key={screen}
            name={screen}
            component={(MigratedScreens_get(screen) ?? PooledWebViewScreen) as React.ComponentType}
          />
        ))}
      </Stack.Navigator>
    );
  };
}

const HomeStack = createTabStack("home");
const ProgramStack = createTabStack("program");
const WorkoutStack = createTabStack("workout");
const GraphsStack = createTabStack("graphs");
const MeStack = createTabStack("me");

const tabConfig: Array<{
  name: ITab;
  component: () => React.ReactElement;
  label: string;
}> = [
  { name: "home", component: HomeStack, label: "Home" },
  { name: "program", component: ProgramStack, label: "Program" },
  { name: "workout", component: WorkoutStack, label: "Workout" },
  { name: "graphs", component: GraphsStack, label: "Graphs" },
  { name: "me", component: MeStack, label: "Me" },
];

const activeTab: ITab = "home";
const initialScreensToPreload = Object.entries(tabInitialScreen)
  .filter(([tab]) => tab !== activeTab)
  .map(([, screen]) => screen);

export function AppNavigator(): React.ReactElement {
  const navigationRef = useNavigationContainerRef();
  const appState = useStoreState();
  const isFirstTimeUser = appState.storage.currentProgramId == null;
  const [showTabBar, setShowTabBar] = useState(!isFirstTimeUser);

  useEffect(() => {
    WebViewPool_initialize();
    WebViewPool_prepareInitialScreens(initialScreensToPreload, JSON.stringify(appState));
  }, []);

  const handleWebViewMessage = useCallback(
    (_slotId: number, msg: IWebViewToRN) => {
      if (msg.type === "navigate") {
        const screen = msg.screen as IScreenName;
        setShowTabBar(ScreenMap_hasTabBar(screen));
        if (msg.shouldResetStack) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (navigationRef as any).reset({ index: 0, routes: [{ name: screenToTab[screen], params: { screen } }] });
        } else {
          const stateJson = JSON.stringify(appState);
          WebViewPool_prepareScreen(`screen-${screen}-${Date.now()}`, screen, stateJson).then((slotId) => {
            navigationRef.dispatch(StackActions.push(screen, { ...(msg.params as object), preparedSlotId: slotId }));
          });
        }
      } else if (msg.type === "goBack") {
        navigationRef.goBack();
      }
    },
    [navigationRef, appState]
  );

  useEffect(() => {
    WebViewPool_setOnMessage(handleWebViewMessage);
    return () => {
      WebViewPool_setOnMessage(null);
    };
  }, [handleWebViewMessage]);

  return (
    <View style={styles.root}>
      <NavigationContainer ref={navigationRef}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: "#6366f1",
            tabBarInactiveTintColor: "#9ca3af",
            tabBarStyle: showTabBar ? undefined : styles.tabBarHidden,
          }}
        >
          {tabConfig.map(({ name, component, label }) => (
            <Tab.Screen key={name} name={name} component={component} options={{ title: label }} />
          ))}
        </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabBarHidden: {
    display: "none",
  },
});
