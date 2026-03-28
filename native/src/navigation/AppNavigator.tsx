import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer, StackActions } from "@react-navigation/native";
import { navigationRef } from "./navigationRef";
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
import { MonthCalendarSheet } from "../components/MonthCalendarSheet";
import { WeekInsightsSheet } from "../components/WeekInsightsSheet";
import { PlannerSettingsSheet } from "../components/PlannerSettingsSheet";
import { ModalGraphsSheet } from "../components/ModalGraphsSheet";
import { MigratedScreens_isMigrated } from "./migratedScreens";

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
  // navigationRef imported from ./navigationRef module
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
          const tab = screenToTab[screen];
          const isInitialScreen = tabInitialScreen[tab] === screen;
          const stateJson = JSON.stringify(appState);
          pool.prepareScreen(isInitialScreen ? screen : tabInitialScreen[tab], stateJson).then((slotId) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (navigationRef as any).reset({
              index: 0,
              routes: [
                {
                  name: "MainTabs",
                  params: {
                    screen: tab,
                    params: { screen: tabInitialScreen[tab], params: { preparedSlotId: slotId } },
                  },
                },
              ],
            });
            if (!isInitialScreen) {
              pool.prepareScreen(screen, stateJson).then((targetSlotId) => {
                navigationRef.dispatch(
                  StackActions.push(screen, { ...(msg.params as object), preparedSlotId: targetSlotId })
                );
              });
            }
          });
        } else {
          const stateJson = JSON.stringify(appState);
          console.log("Pushing screen", screen, "with params", msg.params, "to slot", _slotId);
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

  const onNavigationReady = useCallback(() => {
    if (isFirstTimeUser && MigratedScreens_isMigrated("first")) {
      navigationRef.dispatch(StackActions.push("first"));
    }
  }, [isFirstTimeUser]);

  return (
    <WebViewPoolProvider value={pool}>
      <View style={styles.root}>
        <NavigationContainer ref={navigationRef} onReady={onNavigationReady}>
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
            <RootStack.Screen
              name="MonthCalendarSheet"
              component={MonthCalendarSheet}
              options={{
                presentation: "formSheet",
                sheetGrabberVisible: true,
                sheetAllowedDetents: [0.85, 1.0],
                sheetExpandsWhenScrolledToEdge: false,
                headerShown: true,
                headerShadowVisible: false,
                title: "Calendar",
              }}
            />
            <RootStack.Screen
              name="WeekInsightsSheet"
              component={WeekInsightsSheet}
              options={{
                presentation: "formSheet",
                sheetGrabberVisible: true,
                sheetAllowedDetents: [0.75, 1.0],
                sheetExpandsWhenScrolledToEdge: false,
                headerShown: true,
                headerShadowVisible: false,
                title: "Week Insights",
              }}
            />
            <RootStack.Screen
              name="PlannerSettingsSheet"
              component={PlannerSettingsSheet}
              options={{
                presentation: "formSheet",
                sheetGrabberVisible: true,
                sheetAllowedDetents: [0.85, 1.0],
                sheetExpandsWhenScrolledToEdge: false,
                headerShown: true,
                headerShadowVisible: false,
                title: "Set Range Settings",
              }}
            />
            <RootStack.Screen
              name="ModalGraphsSheet"
              component={ModalGraphsSheet}
              options={{
                presentation: "formSheet",
                sheetGrabberVisible: true,
                sheetAllowedDetents: [0.85, 1.0],
                sheetExpandsWhenScrolledToEdge: false,
                headerShown: true,
                headerShadowVisible: false,
                title: "Graph Settings",
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
