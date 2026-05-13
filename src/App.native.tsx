import React, { useMemo, useRef, useState, useEffect } from "react";
import { ActivityIndicator, AppState, Linking, Platform, View } from "react-native";
import { Client as RollbarClient } from "rollbar-react-native";
import RB from "rollbar";
import { Analytics_initialize, Analytics_setUserId } from "./utils/analytics";
import { RollbarUtils_config } from "./utils/rollbar";

declare let Rollbar: RB;

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
import { AudioInterface } from "./lib/audioInterface";
import { Progress_getCurrentProgress, Progress_lbProgress } from "./models/progress";
import { NativeTimerBridge_subscribeOnScheduled } from "./utils/nativeTimerBridge";
import { NativeWorkoutBridge_subscribeToLiveActivityActions } from "./utils/nativeWorkoutBridge";
import {
  NativeWatchBridge_subscribeToWatchEvents,
  NativeWatchBridge_sendStorageToWatch,
  NativeWatchBridge_sendNoAuthToWatch,
  NativeWatchBridge_sendAuthToWatch,
  NativeWatchBridge_sendClearAuthToWatch,
} from "./utils/nativeWatchBridge";
import { KeychainStore_getAuthToken, KeychainStore_clearAuthToken } from "./utils/keychainStore";
import { lg } from "./utils/posthog";
import { EventManager_initTelemetry } from "./utils/eventManager";
import { WatchStorageFilter_filterJson } from "./utils/watchStorageFilter";
import { lb } from "lens-shmens";
import { updateState } from "./models/state";
import { TourConfigs_findTourId } from "./components/tour/tourConfigs";
import { RestTimer } from "./components/restTimer";
import { IScreen } from "./models/screen";
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
import { SystemBars } from "react-native-edge-to-edge";
import { activateKeepAwake, deactivateKeepAwake } from "@sayem314/react-native-keep-awake";
import { ImportExporter_handleUniversalLink } from "./lib/importexporter";
import {
  Thunk_fetchInitial,
  Thunk_sync2,
  Thunk_syncHealthKit,
  Thunk_iapFetchProducts,
  Thunk_iapHandlePurchase,
  Thunk_iapHandlePurchaseError,
  Thunk_completeSetExternal,
  Thunk_updateTimer,
  Thunk_handleWatchStorageMerge,
  Thunk_reloadStorageFromDisk,
} from "./ducks/thunks";
import { IapAdapter } from "./utils/iap";
import { HealthAdapter } from "./utils/health";
import { WhatsNew_doesHaveNewUpdates } from "./models/whatsnew";

GoogleSignin.configure({
  webClientId: "944666871420-p8kv124sgte8o0p6ev2ah6npudsl7e4f.apps.googleusercontent.com",
  iosClientId: "944666871420-of5rtcpja10vsp2jbe5m6amob7u5qvjq.apps.googleusercontent.com",
  offlineAccess: false,
});

function AppInner(props: { initialState: IState }): React.JSX.Element {
  const env = useMemo<IEnv>(
    () => ({
      service: new Service(fetch),
      audio: new AudioInterface(),
      queue: new AsyncQueue(),
      navigationRef,
      getCurrentScreenData,
      iap: new IapAdapter(),
      health: new HealthAdapter(),
    }),
    []
  );
  const service = env.service;
  const reducer = useMemo(() => reducerWrapper(true), []);
  const onActions = useMemo(() => defaultOnActions(env), [env]);
  const [state, dispatch] = useThunkReducer<IState, IAction, IEnv>(reducer, props.initialState, env, onActions);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    dispatch(Thunk_sync2({ force: true }));
    dispatch(Thunk_fetchInitial());
    dispatch(Thunk_syncHealthKit());
  }, []);

  useEffect(() => {
    if (state.storage.settings.alwaysOnDisplay) {
      activateKeepAwake();
    } else {
      deactivateKeepAwake();
    }
  }, [state.storage.settings.alwaysOnDisplay]);

  useEffect(() => {
    return Analytics_initialize({
      userId: stateRef.current.user?.id ?? stateRef.current.storage.tempUserId,
      onAttribution: (data) => {
        if (data.isOrganic) {
          return;
        }
        const referrer = `${data.mediaSource}_${data.campaign}`;
        if (stateRef.current.storage.referrer === referrer) {
          return;
        }
        updateState(dispatch, [lb<IState>().p("storage").p("referrer").record(referrer)], "Set Referrer");
      },
    });
  }, [dispatch]);

  const personId = state.user?.id ?? state.storage.tempUserId;
  const personEmail = state.user ? state.storage.email : undefined;
  useEffect(() => {
    if (!personId) {
      return;
    }
    Analytics_setUserId(personId);
    Rollbar.configure(RollbarUtils_config({ person: { id: personId, email: personEmail } }));
  }, [personId, personEmail]);

  useEffect(() => {
    if (!personId) {
      return;
    }
    EventManager_initTelemetry((event) => {
      lg(event.name, event.extra, undefined, personId, event.timestamp);
    });
  }, [personId]);

  useEffect(() => {
    const handleLink = (url: string | null): void => {
      if (!url) return;
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return;
      }
      const isLiftosaurHost = parsed.host === "liftosaur.com" || parsed.host === "www.liftosaur.com";
      if (!isLiftosaurHost) return;
      const isImportPath =
        (parsed.pathname === "/program" && parsed.searchParams.has("data")) ||
        parsed.pathname.startsWith("/p/");
      if (!isImportPath) return;
      ImportExporter_handleUniversalLink(dispatch, url, fetch).catch(() => undefined);
    };
    Linking.getInitialURL()
      .then(handleLink)
      .catch(() => undefined);
    const sub = Linking.addEventListener("url", ({ url }) => handleLink(url));
    return () => sub.remove();
  }, [dispatch]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        dispatch(Thunk_sync2({ force: true }));
        dispatch(Thunk_syncHealthKit());
      }
    });
    return () => sub.remove();
  }, [dispatch]);

  useEffect(() => {
    const iap = env.iap;
    if (!iap) {
      return;
    }
    const unsubPurchase = iap.onPurchaseUpdated((purchase) => {
      dispatch(Thunk_iapHandlePurchase(purchase));
    });
    const unsubError = iap.onPurchaseError((error) => {
      dispatch(Thunk_iapHandlePurchaseError(error));
    });
    let cancelled = false;
    (async () => {
      try {
        await iap.initConnection();
      } catch (e) {
        console.warn("IAP initConnection failed", e);
        return;
      }
      if (!cancelled) {
        dispatch(Thunk_iapFetchProducts());
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
      unsubPurchase();
      unsubError();
      iap.endConnection().catch((e) => console.warn("IAP endConnection failed", e));
    };
  }, [env, dispatch]);

  useEffect(() => {
    return NativeTimerBridge_subscribeOnScheduled(() => {
      if (Progress_getCurrentProgress(stateRef.current)?.ui) {
        updateState(
          dispatch,
          [Progress_lbProgress().pi("ui", {}).p("nativeNotificationScheduled").record(true)],
          "Set native notification scheduled"
        );
      }
    });
  }, [dispatch]);

  useEffect(() => {
    const filtered = WatchStorageFilter_filterJson(state.storage);
    NativeWatchBridge_sendStorageToWatch(filtered);
  }, [state.storage]);

  useEffect(() => {
    return NativeWatchBridge_subscribeToWatchEvents((event) => {
      if (event.type === "watchStorageMerge" && event.storage) {
        dispatch(Thunk_handleWatchStorageMerge(event.storage, !!event.isLiveActivity));
      } else if (event.type === "liveActivityStorage" && event.storage) {
        dispatch(Thunk_handleWatchStorageMerge(event.storage, true));
      } else if (event.type === "reloadStorageFromDisk") {
        dispatch(Thunk_reloadStorageFromDisk());
      } else if (event.type === "requestStorage") {
        const filtered = WatchStorageFilter_filterJson(stateRef.current.storage);
        NativeWatchBridge_sendStorageToWatch(filtered);
      } else if (event.type === "requestAuth") {
        const currentUserId = stateRef.current.user?.id;
        KeychainStore_getAuthToken()
          .then((auth) => {
            if (auth && auth.token && currentUserId && auth.userId === currentUserId) {
              NativeWatchBridge_sendAuthToWatch(auth);
            } else {
              if (auth && auth.token && auth.userId !== currentUserId) {
                lg("ls-keychain-stale-on-request", {
                  storedUserId: auth.userId || "",
                  currentUserId: currentUserId || "",
                });
                KeychainStore_clearAuthToken().catch((e) =>
                  lg("ls-keychain-clear-stale-fail", { error: e instanceof Error ? e.message : String(e) })
                );
                NativeWatchBridge_sendClearAuthToWatch();
              } else {
                NativeWatchBridge_sendNoAuthToWatch();
              }
            }
          })
          .catch((e) => {
            lg("ls-keychain-get-auth-fail", { error: e instanceof Error ? e.message : String(e) });
            NativeWatchBridge_sendNoAuthToWatch();
          });
      }
    });
  }, [dispatch]);

  useEffect(() => {
    const currentUserId = stateRef.current.user?.id;
    KeychainStore_getAuthToken()
      .then((auth) => {
        if (!auth || !auth.token) {
          return;
        }
        if (currentUserId && auth.userId === currentUserId) {
          NativeWatchBridge_sendAuthToWatch(auth);
        } else {
          lg("ls-keychain-stale-on-startup", {
            storedUserId: auth.userId || "",
            currentUserId: currentUserId || "",
          });
          KeychainStore_clearAuthToken().catch((e) =>
            lg("ls-keychain-clear-stale-fail", { error: e instanceof Error ? e.message : String(e) })
          );
          NativeWatchBridge_sendClearAuthToWatch();
        }
      })
      .catch((e) => {
        lg("ls-keychain-get-auth-fail-startup", { error: e instanceof Error ? e.message : String(e) });
      });
  }, []);

  useEffect(() => {
    return NativeWorkoutBridge_subscribeToLiveActivityActions((event) => {
      const entryIndex = event.entryIndex ?? 0;
      const setIndex = event.setIndex ?? 0;
      if (event.action === "completeSet") {
        const progress = stateRef.current.storage.progress[0];
        const restTimer = progress?.timer ?? 0;
        const restTimerSince = progress?.timerSince ?? 0;
        dispatch(Thunk_completeSetExternal(entryIndex, setIndex, restTimer, restTimerSince));
      } else if (event.action === "addRestTime") {
        const progress = stateRef.current.storage.progress[0];
        if (progress == null) {
          return;
        }
        const { timer, timerSince } = progress;
        if (timer == null || timerSince == null) {
          return;
        }
        const addSeconds = event.addSeconds ?? 0;
        dispatch(Thunk_updateTimer(Math.max(0, timer + addSeconds), entryIndex, setIndex, false));
      }
    });
  }, [dispatch]);

  const initialScreen = props.initialState.storage.currentProgramId ? "main" : "first";

  const [currentScreenName, setCurrentScreenName] = useState<IScreen | undefined>(undefined);
  const [isNavReady, setIsNavReady] = useState(false);

  useEffect(() => {
    if (!isNavReady) {
      return;
    }
    if (state.tour) {
      navigationRef.navigate("tourModal");
    }
  }, [isNavReady, state.tour]);

  const showCorruptedState = state.errors.corruptedstorage != null;
  const prevShowCorruptedState = useRef(false);
  useEffect(() => {
    if (!isNavReady) {
      return;
    }
    if (showCorruptedState && !prevShowCorruptedState.current) {
      navigationRef.navigate("corruptedStateModal");
    }
    prevShowCorruptedState.current = showCorruptedState;
  }, [isNavReady, showCorruptedState]);

  const shouldShowWhatsNew = WhatsNew_doesHaveNewUpdates(state.storage.whatsNew) || state.showWhatsNew;
  const prevShouldShowWhatsNew = useRef(false);
  useEffect(() => {
    if (!isNavReady) {
      return;
    }
    if (shouldShowWhatsNew && state.storage.whatsNew != null && !prevShouldShowWhatsNew.current) {
      navigationRef.navigate("whatsnewModal");
    }
    prevShouldShowWhatsNew.current = !!(shouldShowWhatsNew && state.storage.whatsNew != null);
  }, [isNavReady, shouldShowWhatsNew, state.storage.whatsNew]);

  useEffect(() => {
    if (!isNavReady || !currentScreenName) {
      return;
    }
    const tourId = TourConfigs_findTourId(stateRef.current, true);
    if (tourId && tourId !== stateRef.current.tour?.id) {
      updateState(dispatch, [lb<IState>().p("tour").record({ id: tourId, enforced: false })], "Auto-start a tour");
    }
  }, [isNavReady, currentScreenName, dispatch]);
  const progress = Progress_getCurrentProgress(state);
  const screensWithoutTimer: IScreen[] = ["subscription"];

  return (
    <AppContext.Provider value={{ service, isApp: true }}>
      <StateContext.Provider value={{ state, dispatch }}>
        <ModalStateProvider>
          <SystemBars style="auto" />
          <NavigationContainer
            ref={navigationRef}
            onStateChange={() => {
              const route = navigationRef.getCurrentRoute();
              setCurrentScreenName(route?.name as IScreen | undefined);
            }}
            onReady={() => {
              const route = navigationRef.getCurrentRoute();
              setCurrentScreenName(route?.name as IScreen | undefined);
              setIsNavReady(true);
            }}
          >
            <AppNavigator initialScreen={initialScreen} />
          </NavigationContainer>
          {progress && currentScreenName && screensWithoutTimer.indexOf(currentScreenName) === -1 && (
            <RestTimer
              progress={progress}
              dispatch={dispatch}
              settings={state.storage.settings}
              subscription={state.storage.subscription}
            />
          )}
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
