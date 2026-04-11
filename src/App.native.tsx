import React, { useState, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

if (__DEV__) {
  const formatTime = (): string => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const ms = String(now.getMilliseconds()).padStart(3, "0");
    return `${hh}:${mm}:${ss}.${ms}`;
  };
  const wrap = (orig: (...args: unknown[]) => void) => {
    return (...args: unknown[]): void => orig(`[${formatTime()}]`, ...args);
  };

  console.log = wrap(console.log.bind(console));

  console.warn = wrap(console.warn.bind(console));

  console.error = wrap(console.error.bind(console));

  console.info = wrap(console.info.bind(console));
}
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { reducerWrapper, defaultOnActions, getInitialState, getIdbKey, IAction } from "./ducks/reducer";
import { useThunkReducer } from "./utils/useThunkReducer";
import { Service } from "./api/service";
import { MockAudioInterface } from "./lib/audioInterface";
import { IEnv, IState } from "./models/state";
import { AsyncQueue } from "./utils/asyncQueue";
import { StateContext } from "./navigation/StateContext";
import { ModalStateProvider } from "./navigation/ModalStateContext";
import { AppNavigator } from "./navigation/AppNavigator";
import { navigationRef } from "./navigation/navigationRef";
import { getCurrentScreenData } from "./navigation/navigationService";
import { IndexedDBUtils_initializeForSafari, IndexedDBUtils_get } from "./utils/indexeddb";
import { Settings_applyTheme, Settings_getTheme } from "./models/settings";
import { TextSize_apply } from "./utils/textSize";

function AppInner(props: { initialState: IState }): React.JSX.Element {
  const client = fetch;
  const audio = new MockAudioInterface();
  const queue = new AsyncQueue();
  const service = new Service(client);
  const env: IEnv = { service, audio, queue, navigationRef, getCurrentScreenData };
  const [state, dispatch] = useThunkReducer<IState, IAction, IEnv>(
    reducerWrapper(true),
    props.initialState,
    env,
    defaultOnActions(env)
  );

  return (
    <StateContext.Provider value={{ state, dispatch }}>
      <ModalStateProvider>
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
        </NavigationContainer>
      </ModalStateProvider>
    </StateContext.Provider>
  );
}

export function App(): React.JSX.Element {
  const [initialState, setInitialState] = useState<IState | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      await IndexedDBUtils_initializeForSafari();
      const key = await getIdbKey();
      const rawStorage = await IndexedDBUtils_get(key);
      const url = new URL("https://www.liftosaur.com/app/");
      const state = await getInitialState(fetch, { rawStorage: rawStorage as string | undefined, url });
      Settings_applyTheme(Settings_getTheme(state.storage.settings));
      TextSize_apply(state.storage.settings.textSize ?? 16);
      setInitialState(state);
    }
    load();
  }, []);

  if (!initialState) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AppInner initialState={initialState} />
    </SafeAreaProvider>
  );
}
