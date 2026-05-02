import React, { useState, useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { Client as RollbarClient } from "rollbar-react-native";

declare let __HOST__: string;

// Inject compile-time constants that are normally provided by webpack's DefinePlugin.
// Metro doesn't have an equivalent, so we attach them to globalThis at module init.
// Toggle the `useLocal` flag for local development vs production.
const useLocal = __DEV__;
const nativeHost = useLocal ? "https://local.liftosaur.com:8080" : "https://www.liftosaur.com";
const nativeApiHost = useLocal ? "https://local-api.liftosaur.com:3000" : "https://api3.liftosaur.com";
const nativeStreamingApiHost = useLocal
  ? "https://local-streaming-api.liftosaur.com:3001"
  : "https://streaming-api.liftosaur.com";

const globalAny = globalThis as unknown as {
  __HOST__: string;
  __API_HOST__: string;
  __STREAMING_API_HOST__: string;
  __ENV__: string;
  __COMMIT_HASH__: string;
  __FULL_COMMIT_HASH__: string;
  __BUNDLE_VERSION_IOS__: number;
  __BUNDLE_VERSION_ANDROID__: number;
};
globalAny.__HOST__ = nativeHost;
globalAny.__API_HOST__ = nativeApiHost;
globalAny.__STREAMING_API_HOST__ = nativeStreamingApiHost;
globalAny.__ENV__ = Platform.OS === "ios" ? "ios-rn" : "android-rn";
globalAny.__COMMIT_HASH__ = "unknown";
globalAny.__FULL_COMMIT_HASH__ = "unknown";
globalAny.__BUNDLE_VERSION_IOS__ = 1;
globalAny.__BUNDLE_VERSION_ANDROID__ = 1;

const rollbarClient = new RollbarClient({
  accessToken: "f29180c0746c4922996ff41dfc2527d2",
  captureUncaught: true,
  captureUnhandledRejections: true,
  payload: {
    environment: Platform.OS === "ios" ? "ios-rn" : "android-rn",
    client: {
      javascript: {
        source_map_enabled: true,
      },
    },
  },
});
rollbarClient.captureUncaughtExceptions();
rollbarClient.captureUnhandledRejections();

const rollbarShim = {
  error: (obj: unknown, extra?: unknown) => rollbarClient.error(obj as never, extra as never),
  warning: (obj: unknown, extra?: unknown) => rollbarClient.warning(obj as never, extra as never),
  warn: (obj: unknown, extra?: unknown) => rollbarClient.warning(obj as never, extra as never),
  info: (obj: unknown, extra?: unknown) => rollbarClient.info(obj as never, extra as never),
  debug: (obj: unknown, extra?: unknown) => rollbarClient.debug(obj as never, extra as never),
  critical: (obj: unknown, extra?: unknown) => rollbarClient.critical(obj as never, extra as never),
  log: (obj: unknown, extra?: unknown) => rollbarClient.log(obj as never, extra as never),
  configure: (config: { payload?: { person?: { id?: string; email?: string; username?: string } } }) => {
    const person = config?.payload?.person;
    if (person?.id) {
      rollbarClient.setPerson(person.id, person.username ?? null, person.email ?? null);
    }
  },
};
(globalThis as unknown as { Rollbar: unknown }).Rollbar = rollbarShim;

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
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
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
import { AppContext } from "./components/appContext";
import { ActionSheetHost } from "./components/actionSheetHost";
import { Thunk_fetchInitial, Thunk_sync2 } from "./ducks/thunks";

GoogleSignin.configure({
  webClientId: "944666871420-p8kv124sgte8o0p6ev2ah6npudsl7e4f.apps.googleusercontent.com",
  iosClientId: "944666871420-of5rtcpja10vsp2jbe5m6amob7u5qvjq.apps.googleusercontent.com",
  offlineAccess: false,
});

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

  useEffect(() => {
    dispatch(Thunk_sync2({ force: true }));
    dispatch(Thunk_fetchInitial());
  }, []);

  const initialScreen = props.initialState.storage.currentProgramId ? "main" : "first";

  return (
    <AppContext.Provider value={{ service, isApp: true }}>
      <StateContext.Provider value={{ state, dispatch }}>
        <ModalStateProvider>
          <NavigationContainer ref={navigationRef}>
            <AppNavigator initialScreen={initialScreen} />
          </NavigationContainer>
          <ActionSheetHost />
        </ModalStateProvider>
      </StateContext.Provider>
    </AppContext.Provider>
  );
}

export function App(): React.JSX.Element {
  const [initialState, setInitialState] = useState<IState | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      await IndexedDBUtils_initializeForSafari();
      const key = await getIdbKey();
      const rawStorage = await IndexedDBUtils_get(key);
      const url = new URL(`${__HOST__}/app/`);
      const state = await getInitialState(fetch, { rawStorage: rawStorage as string | undefined, url });
      Settings_applyTheme(Settings_getTheme(state.storage.settings));
      TextSize_apply(state.storage.settings.textSize ?? 16);
      setInitialState(state);
    }
    load();
  }, []);

  if (!initialState) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppInner initialState={initialState} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
