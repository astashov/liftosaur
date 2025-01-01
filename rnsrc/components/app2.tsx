import "../global.css";
import React, { createContext, useEffect, useRef } from "react";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { IconDoc } from "../../src/components/icons/iconDoc";
import { IconCog2 } from "../../src/components/icons/iconCog2";
import { IInitializeEssentials } from "../initialize";
import { Service } from "../../src/api/service";
import { lb } from "lens-shmens";
import { reducerWrapper, defaultOnActions } from "../../src/ducks/reducer";
import { Thunk } from "../../src/ducks/thunks";
import { IEnv, IState, updateState } from "../../src/models/state";
import { SendMessage } from "../../src/utils/sendMessage";
import { Subscriptions } from "../../src/utils/subscriptions";
import { UrlUtils } from "../../src/utils/url";
import tailwindConfig from "../../tailwind.config.js";
import { IconRuler } from "../../src/components/icons/iconRuler";
import { IconGraphs2 } from "../../src/components/icons/iconGraphs2";
import { WebViewScreen } from "./webViewScreen";
import { useLiftosaurThunkReducer } from "../../src/utils/useLiftosaurThunkReducer";
import { IDispatch } from "../../src/ducks/types.js";

const ProgramStack = (): JSX.Element => {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator>
      <Stack.Screen options={{ headerShown: false }} name="onboarding" component={WebViewScreen} />
      <Stack.Screen options={{ title: "Choose Program" }} name="programs" component={WebViewScreen} />
      <Stack.Screen name="muscles" component={WebViewScreen} />
      <Stack.Screen name="editProgram" component={WebViewScreen} />
      <Stack.Screen name="editProgramWeek" component={WebViewScreen} />
      <Stack.Screen name="editProgramExercise" component={WebViewScreen} />
      <Stack.Screen name="editProgramDay" component={WebViewScreen} />
      <Stack.Screen name="editProgramDayScript" component={WebViewScreen} />
      <Stack.Screen name="programPreview" component={WebViewScreen} />
      <Stack.Screen options={{ headerShown: false }} name="first" component={WebViewScreen} />
      <Stack.Screen name="units" component={WebViewScreen} />
    </Stack.Navigator>
  );
};

const MeasuresStack = (): JSX.Element => {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator>
      <Stack.Screen name="stats" component={WebViewScreen} />
      <Stack.Screen name="measurements" component={WebViewScreen} />
    </Stack.Navigator>
  );
};

const WorkoutStack = (): JSX.Element => {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator>
      <Stack.Screen name="main" component={WebViewScreen} />
      <Stack.Screen name="progress" component={WebViewScreen} />
      <Stack.Screen name="finishDay" component={WebViewScreen} />
      <Stack.Screen name="subscription" component={WebViewScreen} />
      <Stack.Screen name="exerciseStats" component={WebViewScreen} />
    </Stack.Navigator>
  );
};

const GraphsStack = (): JSX.Element => {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator>
      <Stack.Screen name="graphs" component={WebViewScreen} />
    </Stack.Navigator>
  );
};

const SettingsStack = (): JSX.Element => {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator>
      <Stack.Screen name="settings" component={WebViewScreen} />
      <Stack.Screen name="account" component={WebViewScreen} />
      <Stack.Screen name="timers" component={WebViewScreen} />
      <Stack.Screen name="plates" component={WebViewScreen} />
      <Stack.Screen name="appleHealth" component={WebViewScreen} />
      <Stack.Screen name="googleHealth" component={WebViewScreen} />
      <Stack.Screen name="gyms" component={WebViewScreen} />
      <Stack.Screen name="exercises" component={WebViewScreen} />
    </Stack.Navigator>
  );
};

const Tab = createBottomTabNavigator();

interface IAppProps {
  essentials?: IInitializeEssentials;
}

interface IAppContext {
  state?: IState;
  dispatch?: IDispatch;
}
export const DefaultPropsContext = createContext<IAppContext>({});

export default function App(props: IAppProps): JSX.Element {
  console.log("App props", props);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any

  const { client, audio, queue, initialState } = props.essentials!;
  const service = new Service(client);
  const env: IEnv = { service, audio, queue };
  const [state, dispatch] = useLiftosaurThunkReducer(reducerWrapper(true), initialState, env, defaultOnActions(env));
  console.log("Screen stack", state.screenStack);
  const stateRef = useRef<IState>(state);
  useEffect(() => {
    stateRef.current = state;
  });

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

  return (
    <DefaultPropsContext.Provider value={{ state, dispatch }}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size }) => {
              switch (route.name) {
                case "Program":
                  return <IconDoc width={size} height={size} color={color} />;
                case "Measures":
                  return <IconRuler color={color} size={size} />;
                case "Graphs":
                  return <IconGraphs2 color={color} size={size} />;
                case "Settings":
                  return <IconCog2 size={size} color={color} />;
              }
            },
            tabBarIconStyle: {
              marginBottom: 5,
              marginTop: 5,
            },
            headerShown: false,
            tabBarActiveTintColor: tailwindConfig.theme.extend.colors.purplev2.main,
            tabBarInactiveTintColor: tailwindConfig.theme.extend.colors.grayv2.main,
          })}
        >
          <Tab.Screen name="Program" component={ProgramStack} />
          <Tab.Screen name="Measures" component={MeasuresStack} />
          <Tab.Screen name="Workout" component={WorkoutStack} />
          <Tab.Screen name="Graphs" component={GraphsStack} />
          <Tab.Screen name="Settings" component={SettingsStack} />
        </Tab.Navigator>
      </NavigationContainer>
    </DefaultPropsContext.Provider>
  );
}
