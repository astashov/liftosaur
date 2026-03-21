import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer, StackActions, useNavigationContainerRef } from "@react-navigation/native";
import { PooledWebViewScreen } from "../screens/PooledWebViewScreen";
import { WebViewPool, WebViewPoolProvider } from "../screens/WebViewPool";
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
import { useStore, useStoreState } from "../context/StoreContext";
import { TabBar } from "../components/TabBar";
import { NextWorkoutScreen } from "../components/NextWorkoutSheet";
import { ChangeNextDayScreen } from "../components/ChangeNextDaySheet";

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

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
  const store = useStore();
  const appState = useStoreState();
  const pool = useRef(new WebViewPool()).current;
  const isFirstTimeUser = appState.storage.currentProgramId == null;
  const [showTabBar, setShowTabBar] = useState(!isFirstTimeUser);

  useEffect(() => {
    if (!isFirstTimeUser && !showTabBar) {
      setShowTabBar(true);
    }
  }, [isFirstTimeUser]);

  useEffect(() => {
    pool.initialize();
    pool.prepareInitialScreens(initialScreensToPreload, JSON.stringify(appState));
    pool.setOnStorageUpdated(() => {
      store.load();
    });
    return () => {
      pool.setOnStorageUpdated(null);
    };
  }, []);

  const handleWebViewMessage = useCallback(
    (_slotId: number, msg: IWebViewToRN) => {
      if (msg.type === "navigate") {
        const screen = msg.screen as IScreenName;
        setShowTabBar(ScreenMap_hasTabBar(screen));
        if (msg.shouldResetStack) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (navigationRef as any).reset({ index: 0, routes: [{ name: "MainTabs", params: { screen: screenToTab[screen], params: { screen } } }] });
        } else {
          const stateJson = JSON.stringify(appState);
          pool.prepareScreen(screen, stateJson).then((slotId) => {
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
    pool.setOnMessage(handleWebViewMessage);
    return () => {
      pool.setOnMessage(null);
    };
  }, [handleWebViewMessage]);

  return (
    <WebViewPoolProvider value={pool}>
      <View style={styles.root}>
        <NavigationContainer ref={navigationRef}>
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            <RootStack.Screen name="MainTabs">
              {() => (
                <Tab.Navigator
                  tabBar={(props) => (showTabBar ? <TabBar {...props} /> : null)}
                  screenOptions={{ headerShown: false }}
                >
                  {tabConfig.map(({ name, component, label }) => (
                    <Tab.Screen key={name} name={name} component={component} options={{ title: label }} />
                  ))}
                </Tab.Navigator>
              )}
            </RootStack.Screen>
            <RootStack.Screen
              name="NextWorkoutSheet"
              component={NextWorkoutScreen}
              options={{
                presentation: "formSheet",
                sheetGrabberVisible: true,
                sheetAllowedDetents: [0.65, 1.0],
                sheetExpandsWhenScrolledToEdge: false,
                headerShown: true,
                headerShadowVisible: false,
                title: "New Workout",
              }}
            />
            <RootStack.Screen
              name="ChangeNextDaySheet"
              component={ChangeNextDayScreen}
              options={{
                presentation: "formSheet",
                sheetGrabberVisible: true,
                sheetAllowedDetents: [0.65, 1.0],
                sheetExpandsWhenScrolledToEdge: false,
                headerShown: true,
                headerShadowVisible: false,
                title: "Change Next Workout",
              }}
            />
          </RootStack.Navigator>
        </NavigationContainer>
      </View>
    </WebViewPoolProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
