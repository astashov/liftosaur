import { JSX, useEffect, useMemo, useRef, useCallback, useState } from "react";
import { ModalStateProvider } from "../navigation/ModalStateContext";
import { ActiveSheetHeightProvider } from "../navigation/ActiveSheetHeightContext";
import { reducerWrapper, defaultOnActions, IAction } from "../ducks/reducer";
import { Dialog_alert } from "../utils/dialog";
import { Program_getProgram } from "../models/program";
import { useThunkReducer } from "../utils/useThunkReducer";
import {
  Thunk_fetchStorage,
  Thunk_sync2,
  Thunk_postevent,
  Thunk_log,
  Thunk_fetchInitial,
  Thunk_debugTestLogin,
} from "../ducks/thunks";
import { Service } from "../api/service";
import { NativeEffects_apply } from "../models/nativeEffects";
import { ITimerBridge } from "../utils/timerBridge";
import { WorkoutBridge } from "../utils/nativeWorkoutBridge";
import { WatchBridge } from "../utils/nativeWatchBridge";
import { Keychain } from "../utils/keychainStore";
import { WorkoutMirroring } from "../utils/nativeWorkoutMirroringBridge";
import { HeartRateStore } from "../utils/heartRateStore";
import { IAudioInterface } from "../lib/audioInterface";
import { Persistence } from "../utils/persistence";
import { Progress_getCurrentProgress } from "../models/progress";
import { IEnv, IState, updateState } from "../models/state";
import { Notification } from "./notification";
import { Toast } from "./toast";
import { useOnloadModals } from "../navigation/useOnloadModals";
import {
  Subscriptions_cleanupOutdatedAppleReceipts,
  Subscriptions_cleanupOutdatedGooglePurchaseTokens,
} from "../utils/subscriptions";
import { lb } from "lens-shmens";
import { RestTimer } from "./restTimer";
import { UrlUtils_build } from "../utils/url";
import { AsyncQueue } from "../utils/asyncQueue";
import { useLoopCatcher } from "../utils/useLoopCatcher";
import RB from "rollbar";
import { exceptionIgnores } from "../utils/rollbar";

// typeof-guarded: Metro/webpack define __DEV__, but this module also runs under node (tests).
declare let __DEV__: boolean | undefined;
import { useAppliedTextSize } from "../utils/textSize";
import { useAppliedTheme } from "../utils/appliedTheme";
import { AppContext } from "./appContext";
import { TourConfigs_findTourId } from "./tour/tourConfigs";
import { NavigationContainer, DefaultTheme, type NavigationState } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { navigationRef } from "../navigation/navigationRef";
import { ScreenRemovalCleanup_subscribe } from "../navigation/screenRemovalCleanup";
import { navigateToModal } from "../navigation/navigationService";
import { getCurrentScreenData } from "../navigation/navigationService";
import { StateContext } from "../navigation/StateContext";
import { TrackedStateProvider } from "../navigation/TrackedStateContext";
import { ClickTrackingContext } from "../utils/clickTracking";
import { AppNavigator } from "../navigation/AppNavigator";
import type { IScreen } from "../models/screen";

declare let Rollbar: RB;
declare let __COMMIT_HASH__: string;

interface IProps {
  client: Window["fetch"];
  audio: IAudioInterface;
  initialState: IState;
  queue: AsyncQueue;
  persistence: Persistence;
  timer: ITimerBridge;
}

function getScreenNameFromNavState(navState: NavigationState | undefined): IScreen {
  if (!navState) {
    return "main";
  }
  const rootRoute = navState.routes[navState.index ?? 0];
  if (rootRoute.name === "onboarding") {
    const onboardingState = rootRoute.state as NavigationState | undefined;
    if (!onboardingState) {
      return "first";
    }
    return onboardingState.routes[onboardingState.index ?? 0].name as IScreen;
  }
  if (rootRoute.name === "subscription") {
    return "subscription";
  }
  const mainTabsState = rootRoute.state as NavigationState | undefined;
  if (!mainTabsState) {
    return "main";
  }
  const activeTab = mainTabsState.routes[mainTabsState.index ?? 0];
  const tabStackState = activeTab.state as NavigationState | undefined;
  if (!tabStackState) {
    return "main";
  }
  return tabStackState.routes[tabStackState.index ?? 0].name as IScreen;
}

export function AppView(props: IProps): JSX.Element | null {
  const { client, audio, queue, persistence } = props;
  const timerBridge = props.timer;
  const env = useMemo<IEnv>(() => {
    const mirroring = new WorkoutMirroring();
    return {
      service: new Service(client),
      audio,
      queue,
      persistence,
      navigationRef,
      getCurrentScreenData,
      timer: timerBridge,
      workout: new WorkoutBridge(),
      watch: new WatchBridge(),
      keychain: new Keychain(),
      mirroring,
      heartRate: new HeartRateStore(mirroring),
    };
  }, [client, audio, queue, persistence, timerBridge]);
  const service = env.service;
  const reducer = useMemo(
    () => reducerWrapper(true, persistence, (effects) => NativeEffects_apply(env, effects)),
    [persistence, env]
  );
  const onActions = useMemo(() => defaultOnActions(env), [env]);
  const [state, dispatch] = useThunkReducer<IState, IAction, IEnv>(reducer, props.initialState, env, onActions);
  const stateRef = useRef<IState>(state);
  useEffect(() => {
    stateRef.current = state;
  });
  useEffect(() => {
    return ScreenRemovalCleanup_subscribe(dispatch);
  }, []);

  useEffect(() => {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      // setTimeout so a CDP-eval caller returns before the heavy login work saturates the JS
      // thread — evaluating it inline can segfault Hermes' debugger VM
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).debugLogin = (apiKey?: string) =>
        new Promise((resolve) => setTimeout(() => dispatch(Thunk_debugTestLogin(apiKey, resolve)), 0));
    }
  }, []);

  useAppliedTextSize(state.storage.settings);
  useAppliedTheme(state.storage.settings);

  useLoopCatcher();

  const [isNavReady, setIsNavReady] = useState(false);

  useOnloadModals(state, dispatch, isNavReady);

  const showCorruptedState = state.errors.corruptedstorage != null;
  const prevShowCorruptedState = useRef(false);
  useEffect(() => {
    if (!isNavReady) {
      return;
    }
    if (showCorruptedState && !prevShowCorruptedState.current) {
      navigateToModal("corruptedStateModal");
    }
    prevShowCorruptedState.current = showCorruptedState;
  }, [isNavReady, showCorruptedState]);

  const prevShowSignupRequest = useRef(false);
  useEffect(() => {
    if (!isNavReady) {
      return;
    }
    if (state.showSignupRequest && !prevShowSignupRequest.current) {
      navigateToModal("signupRequestModal");
    }
    prevShowSignupRequest.current = !!state.showSignupRequest;
  }, [isNavReady, state.showSignupRequest]);

  useEffect(() => {
    if (!isNavReady) {
      return;
    }
    if (state.tour) {
      navigateToModal("tourModal");
    }
  }, [isNavReady, state.tour]);

  const checkToursRef = useRef(() => {
    const tourId = TourConfigs_findTourId(stateRef.current, true);
    if (tourId && tourId !== stateRef.current.tour?.id) {
      updateState(
        dispatch,
        [lb<IState>().p("tour").record({ id: tourId, enforced: false, screenData: getCurrentScreenData() })],
        "Auto-start a tour"
      );
    }
  });
  checkToursRef.current = () => {
    const tourId = TourConfigs_findTourId(stateRef.current, true);
    if (tourId && tourId !== stateRef.current.tour?.id) {
      updateState(
        dispatch,
        [lb<IState>().p("tour").record({ id: tourId, enforced: false, screenData: getCurrentScreenData() })],
        "Auto-start a tour"
      );
    }
  };

  useEffect(() => {
    const url =
      typeof window !== "undefined" ? UrlUtils_build(window.location.href, "https://liftosaur.com") : undefined;
    const urlUserId = url != null ? url.searchParams.get("userid") || undefined : undefined;
    if (state.adminKey != null && urlUserId != null) {
      const storageId = url != null ? url.searchParams.get("storageid") || undefined : undefined;
      dispatch(Thunk_fetchStorage(storageId));
    } else {
      dispatch(Thunk_sync2({ force: true }));
    }
    window.addEventListener("click", (e) => {
      let button: HTMLElement | undefined;
      let el: HTMLElement | undefined = e.target as HTMLElement;
      while (el != null && el.getAttribute != null) {
        const element = el as HTMLElement;
        const classes = (element.getAttribute("class") || "").split(/\s+/);
        if (classes.some((cl) => cl.startsWith("ls-")) || classes.some((cl) => cl.startsWith("nm-"))) {
          button = el;
          break;
        }
        el = el.parentNode as HTMLElement | undefined;
      }
      if (button != null) {
        const lsName = (button.getAttribute("class") || "")
          .split(/\s+/)
          .map((s) => s.trim())
          .filter((c) => c.startsWith("ls-"))[0];
        const nsName = (button.getAttribute("class") || "")
          .split(/\s+/)
          .map((s) => s.trim())
          .filter((c) => c.startsWith("nm-"))[0];
        const name = lsName || nsName;
        dispatch(Thunk_postevent("click-" + name));
        if (lsName) {
          dispatch(Thunk_log(lsName));
        }
      }
    });
    const userId = state.user?.id || state.storage.tempUserId;
    Subscriptions_cleanupOutdatedAppleReceipts(dispatch, userId, service, state.storage.subscription);
    Subscriptions_cleanupOutdatedGooglePurchaseTokens(dispatch, userId, service, state.storage.subscription);
    dispatch(Thunk_fetchInitial());
    const onerror = (event: string | ErrorEvent): void => {
      console.log("Error Event", event);
      const error = typeof event === "string" ? event : "error" in event ? event.error : event;
      console.log("Error", error);
      const message = error instanceof Error ? error.message : error;
      if (message != null) {
        console.log("Error Message", message);
        Rollbar.error(error, (_err, data) => {
          const uuid = data?.result?.uuid;
          if (exceptionIgnores.every((ignore) => !message.includes(ignore))) {
            service.postEvent({
              type: "error",
              commithash: __COMMIT_HASH__,
              userId: userId,
              timestamp: Date.now(),
              message: typeof error === "string" ? error : error?.error?.message || "",
              stack: typeof error === "string" ? "" : error?.error?.stack || "",
              rollbar_id: uuid || "",
            });
          }
        });
      }
    };
    const onunhandledexception = (event: PromiseRejectionEvent): void => {
      const reason = event.reason;
      const message = typeof reason === "string" ? reason : reason.message;
      if (message != null) {
        console.log("Exception Message", message);
        Rollbar.error(reason, (_err, data) => {
          const uuid = data?.result?.uuid;
          if (exceptionIgnores.every((ignore) => !message.includes(ignore))) {
            service.postEvent({
              type: "error",
              userId: userId,
              timestamp: Date.now(),
              commithash: __COMMIT_HASH__,
              message: message || "",
              stack: reason.stack || "",
              rollbar_id: uuid || "",
            });
          }
        });
      }
    };
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.replaceState = (newState: any) => {
        dispatch({ type: "ReplaceState", state: newState });
      };
      window.addEventListener("error", onerror);
      window.addEventListener("unhandledrejection", onunhandledexception);
    }
    const currentProgram =
      state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;
    if (currentProgram != null && currentProgram.planner == null) {
      Dialog_alert(
        "You're using OLD STYLE programs, which won't be supported, and WILL STOP WORKING starting from Feb 3, 2025! Please go to Program screen, and migrate the program to the new style"
      );
    }

    return () => {
      window.removeEventListener("error", onerror);
      window.removeEventListener("unhandledrejection", onunhandledexception);
    };
  }, []);

  const onNavigationStateChange = useCallback((navState: NavigationState | undefined) => {
    const screenName = getScreenNameFromNavState(navState);
    document.body.setAttribute("data-screen", screenName);
    window.scroll(0, 0);
    checkToursRef.current();
  }, []);

  const shouldSkipIntro =
    typeof window !== "undefined" && window?.location
      ? !!UrlUtils_build(window.location.href).searchParams.get("skipintro")
      : false;
  const initialScreen = props.initialState.storage.currentProgramId
    ? "main"
    : shouldSkipIntro
      ? "programselect"
      : "first";

  const progress = Progress_getCurrentProgress(state);
  const currentScreenName = navigationRef.isReady()
    ? (navigationRef.getCurrentRoute()?.name as IScreen | undefined)
    : undefined;
  const screensWithoutTimer: IScreen[] = ["subscription"];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StateContext.Provider value={{ state, dispatch }}>
          <TrackedStateProvider state={state} dispatch={dispatch}>
            <ClickTrackingContext.Provider value={dispatch}>
              <ModalStateProvider>
                <ActiveSheetHeightProvider>
                  <AppContext.Provider value={{ service, isApp: true }}>
                    <NavigationContainer
                      ref={navigationRef}
                      onReady={() => setIsNavReady(true)}
                      onStateChange={onNavigationStateChange}
                      documentTitle={{ enabled: false }}
                      theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: "transparent" } }}
                    >
                      <AppNavigator initialScreen={initialScreen} />
                    </NavigationContainer>
                  </AppContext.Provider>
                </ActiveSheetHeightProvider>
              </ModalStateProvider>
            </ClickTrackingContext.Provider>
          </TrackedStateProvider>
        </StateContext.Provider>
        {progress && currentScreenName && screensWithoutTimer.indexOf(currentScreenName) === -1 && (
          <RestTimer
            progress={progress}
            dispatch={dispatch}
            settings={state.storage.settings}
            subscription={state.storage.subscription}
          />
        )}
        <Notification dispatch={dispatch} notification={state.notification} />
        <Toast toast={state.toast} dispatch={dispatch} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
