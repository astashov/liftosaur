import React, { useState, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
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
