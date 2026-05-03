import { JSX, useEffect, useRef, useCallback, useState } from "react";
import { ModalStateProvider } from "../navigation/ModalStateContext";
import { reducerWrapper, defaultOnActions, IAction } from "../ducks/reducer";
import { Program_getProgram } from "../models/program";
import { useThunkReducer } from "../utils/useThunkReducer";
import {
  Thunk_fetchStorage,
  Thunk_sync2,
  Thunk_postevent,
  Thunk_log,
  Thunk_setAppleReceipt,
  Thunk_setGooglePurchaseToken,
  Thunk_syncHealthKit,
  Thunk_pullScreen,
  Thunk_completeSetExternal,
  Thunk_updateLiveActivity,
  Thunk_updateTimer,
  Thunk_handleWatchStorageMerge,
  Thunk_reloadStorageFromDisk,
  Thunk_fetchInitial,
} from "../ducks/thunks";
import { Service } from "../api/service";
import { IAudioInterface } from "../lib/audioInterface";
import { Progress_getCurrentProgress, Progress_lbProgress } from "../models/progress";
import { IAttributionData, IEnv, IState, updateState } from "../models/state";
import { Notification } from "./notification";
import { WhatsNew_doesHaveNewUpdates } from "../models/whatsnew";
import {
  Subscriptions_cleanupOutdatedAppleReceipts,
  Subscriptions_cleanupOutdatedGooglePurchaseTokens,
  Subscriptions_isEligibleForThanksgivingPromo,
} from "../utils/subscriptions";
import { lb } from "lens-shmens";
import { RestTimer } from "./restTimer";
import { ImportExporter_handleUniversalLink } from "../lib/importexporter";
import { SendMessage_toAndroid, SendMessage_toIos, SendMessage_print } from "../utils/sendMessage";
import { UrlUtils_build } from "../utils/url";
import { AsyncQueue } from "../utils/asyncQueue";
import { useLoopCatcher } from "../utils/useLoopCatcher";
import RB from "rollbar";
import { exceptionIgnores } from "../utils/rollbar";
import { ImagePreloader_preload, ImagePreloader_dynocoach } from "../utils/imagePreloader";
import { Settings_applyTheme } from "../models/settings";
import { TextSize_apply } from "../utils/textSize";
import { AppContext } from "./appContext";
import { TourConfigs_findTourId } from "./tour/tourConfigs";
import { NavigationContainer, DefaultTheme, type NavigationState } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { navigationRef } from "../navigation/navigationRef";
import { getCurrentScreenData } from "../navigation/navigationService";
import { StateContext } from "../navigation/StateContext";
import { AppNavigator } from "../navigation/AppNavigator";
import type { IScreen } from "../models/screen";

declare let Rollbar: RB;
declare let __COMMIT_HASH__: string;

interface IProps {
  client: Window["fetch"];
  audio: IAudioInterface;
  initialState: IState;
  queue: AsyncQueue;
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
  const { client, audio, queue } = props;
  const service = new Service(client);
  const env: IEnv = { service, audio, queue, navigationRef, getCurrentScreenData };
  const [state, dispatch] = useThunkReducer<IState, IAction, IEnv>(
    reducerWrapper(true),
    props.initialState,
    env,
    defaultOnActions(env)
  );
  const stateRef = useRef<IState>(state);
  useEffect(() => {
    stateRef.current = state;
  });
  const shouldShowWhatsNew = WhatsNew_doesHaveNewUpdates(state.storage.whatsNew) || state.showWhatsNew;
  const isEligibleForThanks25 = Subscriptions_isEligibleForThanksgivingPromo(
    state.storage.history.length > 0,
    state.storage.subscription
  );
  const helps = state.storage.helps;

  useEffect(() => {
    SendMessage_toAndroid({ type: "setAlwaysOnDisplay", value: `${!!state.storage.settings.alwaysOnDisplay}` });
    SendMessage_toIos({ type: "setAlwaysOnDisplay", value: `${!!state.storage.settings.alwaysOnDisplay}` });
  }, [state.storage.settings.alwaysOnDisplay]);

  useEffect(() => {
    TextSize_apply(state.storage.settings.textSize ?? 16);
  }, [state.storage.settings.textSize]);

  useLoopCatcher();

  const [isNavReady, setIsNavReady] = useState(false);

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

  const showThanks25 = isEligibleForThanks25 && !helps.includes("thanks25");
  const prevShowThanks25 = useRef(false);
  useEffect(() => {
    if (!isNavReady) {
      return;
    }
    if (showThanks25 && !prevShowThanks25.current) {
      navigationRef.navigate("thanks25Modal");
    }
    prevShowThanks25.current = showThanks25;
  }, [isNavReady, showThanks25]);

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

  const prevShowSignupRequest = useRef(false);
  useEffect(() => {
    if (!isNavReady) {
      return;
    }
    if (state.showSignupRequest && !prevShowSignupRequest.current) {
      navigationRef.navigate("signupRequestModal");
    }
    prevShowSignupRequest.current = !!state.showSignupRequest;
  }, [isNavReady, state.showSignupRequest]);

  const prevTour = useRef(false);
  useEffect(() => {
    if (!isNavReady) {
      return;
    }
    if (state.tour && !prevTour.current) {
      navigationRef.navigate("tourModal");
    }
    prevTour.current = !!state.tour;
  }, [isNavReady, state.tour]);

  const checkToursRef = useRef(() => {
    const tourId = TourConfigs_findTourId(stateRef.current, true);
    if (tourId && tourId !== stateRef.current.tour?.id) {
      updateState(dispatch, [lb<IState>().p("tour").record({ id: tourId, enforced: false })], "Auto-start a tour");
    }
  });
  checkToursRef.current = () => {
    const tourId = TourConfigs_findTourId(stateRef.current, true);
    if (tourId && tourId !== stateRef.current.tour?.id) {
      updateState(dispatch, [lb<IState>().p("tour").record({ id: tourId, enforced: false })], "Auto-start a tour");
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
    window.addEventListener("message", (event) => {
      if (event.data?.type === "setAppleReceipt") {
        dispatch(Thunk_setAppleReceipt(event.data.receipt));
      } else if (event.data?.type === "setGooglePurchaseToken") {
        dispatch(Thunk_setGooglePurchaseToken(event.data.productId, event.data.token));
      } else if (event.data?.type === "loaded") {
        dispatch(Thunk_postevent("loaded"));
        dispatch(Thunk_syncHealthKit());
      } else if (event.data?.type === "wake") {
        dispatch(Thunk_postevent("wake"));
        queue.clearStaleOperations();
        dispatch(Thunk_sync2({ force: true }));
        dispatch(Thunk_syncHealthKit());
      } else if (event.data?.type === "syncToAppleHealthError") {
        dispatch(Thunk_postevent("apple-health-error"));
        alert(event.data.error);
      } else if (event.data?.type === "stopSubscriptionLoading") {
        updateState(dispatch, [lb<IState>().p("subscriptionLoading").record(undefined)], "Stop subscription loading");
      } else if (event.data?.type === "products") {
        dispatch(Thunk_postevent("sync-prices"));
        const newPrices = { ...state.prices, ...event.data.data };
        const newOffers = { ...state.offers, ...event.data.offers };
        updateState(
          dispatch,
          [lb<IState>().p("prices").record(newPrices), lb<IState>().p("offers").record(newOffers)],
          "Update prices for products"
        );
      } else if (event.data?.type === "universalLink") {
        ImportExporter_handleUniversalLink(dispatch, event.data.link, client);
      } else if (event.data?.type === "goBack") {
        dispatch(Thunk_postevent("go-back"));
        dispatch(Thunk_pullScreen());
      } else if (event.data?.type === "attribution") {
        if (event.data?.data != null && !event.data?.data.isOrganic) {
          const data = event.data?.data as IAttributionData;
          const referrer = `${data.mediaSource}_${data.campaign}`;
          if (state.storage.referrer !== referrer) {
            dispatch(Thunk_postevent("set-referrer", { referrer }));
            updateState(dispatch, [lb<IState>().p("storage").p("referrer").record(referrer)], "Set Referrer");
          }
        }
      } else if (event.data?.type === "requestedReview") {
        dispatch(Thunk_postevent("requested-review"));
        updateState(
          dispatch,
          [
            lb<IState>()
              .p("storage")
              .p("reviewRequests")
              .recordModify((r) => [...r, Date.now()]),
          ],
          "Add review request"
        );
      } else if (event.data?.type === "completeSet") {
        SendMessage_print("Main app: Received completeSet message");
        const entryIndex = event.data.entryIndex as number;
        const setIndex = event.data.setIndex as number;
        const restTimer = event.data.restTimer as number;
        const restTimerSince = event.data.restTimerSince as number;
        dispatch(Thunk_completeSetExternal(entryIndex, setIndex, restTimer, restTimerSince));
      } else if (event.data?.type === "adjustRestTimer") {
        const action = event.data.action as "increase" | "decrease";
        const incomingRestTimer = event.data.restTimer as number;
        const incomingRestTimerSince = event.data.restTimerSince as number;
        const entryIndex = event.data.entryIndex as number;
        const setIndex = event.data.setIndex as number;
        const progress = stateRef.current.storage.progress[0];
        const skipLiveActivityUpdate = !!event.data.skipLiveActivityUpdate;
        if (progress == null) {
          SendMessage_print("Main app: No active workout to adjust rest timer");
          return;
        }
        const { timer, timerSince } = progress;
        SendMessage_print(`Main app: ${action === "increase" ? "Increasing" : "Decreasing"} rest timer by 15 seconds`);
        SendMessage_print(`Main app: Current timer: ${timer}, since: ${timerSince}`);
        if (timer == null || timerSince == null) {
          return;
        }
        if (incomingRestTimer !== timer || incomingRestTimerSince !== timerSince) {
          SendMessage_print(
            `Main app: Incoming rest timer data does not match current state, refreshing live activity. ${incomingRestTimer} != ${timer} || ${incomingRestTimerSince} != ${timerSince}`
          );
          if (!skipLiveActivityUpdate) {
            dispatch(Thunk_updateLiveActivity(entryIndex, setIndex, timer, timerSince));
          }
        } else {
          dispatch(
            Thunk_updateTimer(
              action === "increase" ? timer + 15 : Math.max(0, timer - 15),
              entryIndex,
              setIndex,
              skipLiveActivityUpdate
            )
          );
        }
      } else if (event.data?.type === "timerScheduled") {
        if (Progress_getCurrentProgress(stateRef.current)?.ui) {
          SendMessage_print(`Main app: Marking native notification as scheduled`);
          updateState(
            dispatch,
            [Progress_lbProgress().pi("ui", {}).p("nativeNotificationScheduled").record(true)],
            "Set native notification scheduled"
          );
        }
      } else if (event.data?.type === "watchStorageMerge") {
        const storageJson = event.data.storage as string;
        const isLiveActivity = !!event.data.isLiveActivity;
        dispatch(Thunk_handleWatchStorageMerge(storageJson, isLiveActivity));
      } else if (event.data?.type === "reloadStorageFromDisk") {
        dispatch(Thunk_reloadStorageFromDisk());
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
    SendMessage_toIos({ type: "loaded", userid: userId });
    SendMessage_toAndroid({ type: "loaded", userid: userId });

    const currentProgram =
      state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;
    if (currentProgram != null && currentProgram.planner == null) {
      alert(
        "You're using OLD STYLE programs, which won't be supported, and WILL STOP WORKING starting from Feb 3, 2025! Please go to Program screen, and migrate the program to the new style"
      );
    }

    if (state.storage.history.length === 0) {
      ImagePreloader_preload(ImagePreloader_dynocoach);
    }

    Settings_applyTheme(state.storage.settings.theme || (window.lftSystemDarkMode ? "dark" : "light"));

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
  const { lftAndroidSafeInsetTop, lftAndroidSafeInsetBottom } = window;
  const currentScreenName = navigationRef.isReady()
    ? (navigationRef.getCurrentRoute()?.name as IScreen | undefined)
    : undefined;
  const screensWithoutTimer: IScreen[] = ["subscription"];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <style
          dangerouslySetInnerHTML={{
            __html: `
        ${lftAndroidSafeInsetTop ? `.safe-area-inset-top { padding-top: ${lftAndroidSafeInsetTop}px; }` : ""}
        ${
          lftAndroidSafeInsetBottom ? `.safe-area-inset-bottom { padding-bottom: ${lftAndroidSafeInsetBottom}px; }` : ""
        }
      `,
          }}
        />
        <StateContext.Provider value={{ state, dispatch }}>
          <ModalStateProvider>
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
          </ModalStateProvider>
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
