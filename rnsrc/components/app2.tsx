import React, { useEffect, useRef } from "react";
import { View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { IconDoc } from "../../src/components/icons/iconDoc";
import { IconCog2 } from "../../src/components/icons/iconCog2";
import { WebView } from "react-native-webview";
import { IInitializeEssentials } from "../initialize";
import { Service } from "../../src/api/service";
import { useThunkReducer } from "../../src/utils/useThunkReducer";
import { lb } from "lens-shmens";
import { IAction, reducerWrapper, defaultOnActions } from "../../src/ducks/reducer";
import { Thunk } from "../../src/ducks/thunks";
import { Program } from "../../src/models/program";
import { IEnv, IState, updateState } from "../../src/models/state";
import { WhatsNew } from "../../src/models/whatsnew";
import { SendMessage } from "../../src/utils/sendMessage";
import { Subscriptions } from "../../src/utils/subscriptions";
import { UrlUtils } from "../../src/utils/url";

// Screens
const WebViewScreen = (): JSX.Element => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "stretch" }}>
    <WebView
      source={{ uri: "https://local.liftosaur.com:8080/app/" }}
      injectedJavaScript={`
      window.appState = {};
    `}
      onMessage={(event) => {
        console.log("Message from WebView:", event.nativeEvent.data);
      }}
      style={{ flex: 1 }}
    />
  </View>
);

const SettingsScreen = (): JSX.Element => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <Text>Settings Screen</Text>
  </View>
);

// Create Bottom Tabs
const Tab = createBottomTabNavigator();

interface IAppProps {
  essentials: IInitializeEssentials;
}

export default function App(props: IAppProps): JSX.Element {
  console.log("App props", props);

  const { client, audio, queue, initialState } = props.essentials;
  const service = new Service(client);
  const env: IEnv = { service, audio, queue };
  const [state, dispatch] = useThunkReducer<IState, IAction, IEnv>(
    reducerWrapper(true),
    initialState,
    env,
    defaultOnActions(env)
  );
  const stateRef = useRef<IState>(state);
  useEffect(() => {
    stateRef.current = state;
  });
  const shouldShowWhatsNew = WhatsNew.doesHaveNewUpdates(state.storage.whatsNew) || state.showWhatsNew;

  useEffect(() => {
    SendMessage.toAndroid({ type: "setAlwaysOnDisplay", value: `${!!state.storage.settings.alwaysOnDisplay}` });
    SendMessage.toIos({ type: "setAlwaysOnDisplay", value: `${!!state.storage.settings.alwaysOnDisplay}` });
  }, [state.storage.settings.alwaysOnDisplay]);

  useEffect(() => {
    console.log("A");
    const url =
      typeof document !== "undefined" ? UrlUtils.build(document.location.href, "https://liftosaur.com") : undefined;
    console.log("B");
    const urlUserId = url != null ? url.searchParams.get("userid") || undefined : undefined;
    if (state.adminKey != null && urlUserId != null) {
      const storageId = url != null ? url.searchParams.get("storageid") || undefined : undefined;
      dispatch(Thunk.fetchStorage(storageId));
    } else {
      dispatch(Thunk.sync2({ force: true }));
    }
    const userId = state.user?.id || state.storage.tempUserId;
    Subscriptions.cleanupOutdatedAppleReceipts(dispatch, userId, service, state.storage.subscription);
    Subscriptions.cleanupOutdatedGooglePurchaseTokens(dispatch, userId, service, state.storage.subscription);
    dispatch(Thunk.fetchInitial());
    if (typeof window !== "undefined") {
      const source = url?.searchParams.get("s");
      if (source) {
        updateState(dispatch, [
          lb<IState>()
            .p("storage")
            .p("affiliates")
            .recordModify((affiliates) => ({ [source]: Date.now(), ...affiliates })),
        ]);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).replaceState = (newState: any) => {
        dispatch({ type: "ReplaceState", state: newState });
      };
    }
    SendMessage.toIos({ type: "loaded", userid: userId });
    SendMessage.toAndroid({ type: "loaded", userid: userId });
  }, []);

  const currentProgram =
    state.storage.currentProgramId != null ? Program.getProgram(state, state.storage.currentProgramId) : undefined;

  console.log("Current program", currentProgram);

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            if (route.name === "Home") {
              return <IconDoc width={size} height={size} />;
            } else if (route.name === "Settings") {
              return <IconCog2 size={size} />;
            }
          },
          tabBarActiveTintColor: "tomato",
          tabBarInactiveTintColor: "gray",
        })}
      >
        <Tab.Screen name="Home" component={() => <HomeScreen />} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
