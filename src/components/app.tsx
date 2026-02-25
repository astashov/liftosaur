import { h, JSX, Fragment } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { reducerWrapper, defaultOnActions, IAction } from "../ducks/reducer";
import { ChooseProgramView } from "./chooseProgram";
import { ProgramHistoryView } from "./programHistory";
import { Program_getProgram, Program_getFullProgram, Program_fullProgram } from "../models/program";
import { IScreen, Screen_currentName, Screen_current } from "../models/screen";
import { ScreenSettings } from "./screenSettings";
import { ScreenAccount } from "./screenAccount";
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
import { ScreenTimers } from "./screenTimers";
import { ScreenEquipment } from "./screenEquipment";
import { ScreenGraphs } from "./screenGraphs";
import { ScreenEditProgram } from "./screenEditProgram";
import {
  Progress_getCurrentProgress,
  Progress_lbProgress,
  Progress_getProgress,
  Progress_isCurrent,
} from "../models/progress";
import { IAttributionData, IEnv, INavCommon, IState, updateState } from "../models/state";
import { ScreenFinishDay } from "./screenFinishDay";
import { ScreenMusclesProgram } from "./muscles/screenMusclesProgram";
import { ScreenMusclesDay } from "./muscles/screenMusclesDay";
import { ScreenStats } from "./screenStats";
import { Notification } from "./notification";
import { WhatsNew_doesHaveNewUpdates, WhatsNew_updateStorage } from "../models/whatsnew";
import { ModalWhatsnew } from "./modalWhatsnew";
import { ScreenMeasurements } from "./screenMeasurements";
import { ScreenSubscription } from "./screenSubscription";
import {
  Subscriptions_cleanupOutdatedAppleReceipts,
  Subscriptions_cleanupOutdatedGooglePurchaseTokens,
  Subscriptions_isEligibleForThanksgivingPromo,
} from "../utils/subscriptions";
import { lb } from "lens-shmens";
import { ScreenProgramPreview } from "./screenProgramPreview";
import { ScreenExerciseStats } from "./screenExerciseStats";
import { Exercise_find, Exercise_toKey } from "../models/exercise";
import { RestTimer } from "./restTimer";
import { ScreenFirst } from "./screenFirst";
import { ImportExporter_handleUniversalLink } from "../lib/importexporter";
import { ModalSignupRequest } from "./modalSignupRequest";
import { SendMessage_toAndroid, SendMessage_toIos, SendMessage_print } from "../utils/sendMessage";
import { ModalCorruptedState } from "./modalCorruptedState";
import { UrlUtils } from "../utils/url";
import { AsyncQueue } from "../utils/asyncQueue";
import { useLoopCatcher } from "../utils/useLoopCatcher";
import { Equipment_getEquipmentOfGym } from "../models/equipment";
import { ScreenGyms } from "./screenGyms";
import { ScreenExercises } from "./screenExercises";
import { ScreenAppleHealthSettings } from "./screenAppleHealthSettings";
import { ScreenGoogleHealthSettings } from "./screenGoogleHealthSettings";
import { ScreenUnitSelector } from "./screenUnitSelector";
import RB from "rollbar";
import { exceptionIgnores } from "../utils/rollbar";
import { ScreenWorkout } from "./screenWorkout";
import { Account_getFromStorage } from "../models/account";
import { ImagePreloader } from "../utils/imagePreloader";
import { ScreenEditProgramExercise } from "./editProgramExercise/screenEditProgramExercise";
import { FallbackScreen } from "./fallbackScreen";
import { Screen1RM } from "./screen1RM";
import { ScreenSetupEquipment } from "./screenSetupEquipment";
import { Settings_applyTheme } from "../models/settings";
import { AppContext } from "./appContext";
import { ScreenMuscleGroups } from "./screenMuscleGroups";
import { ModalThanks25 } from "./modalThanks25";

declare let Rollbar: RB;
declare let __COMMIT_HASH__: string;

interface IProps {
  client: Window["fetch"];
  audio: IAudioInterface;
  initialState: IState;
  queue: AsyncQueue;
}

export function AppView(props: IProps): JSX.Element | null {
  const { client, audio, queue } = props;
  const service = new Service(client);
  const env: IEnv = { service, audio, queue };
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

  useEffect(() => {
    SendMessage_toAndroid({ type: "setAlwaysOnDisplay", value: `${!!state.storage.settings.alwaysOnDisplay}` });
    SendMessage_toIos({ type: "setAlwaysOnDisplay", value: `${!!state.storage.settings.alwaysOnDisplay}` });
  }, [state.storage.settings.alwaysOnDisplay]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${state.storage.settings.textSize ?? 16}px`;
  }, [state.storage.settings.textSize]);

  useLoopCatcher();

  useEffect(() => {
    const url =
      typeof window !== "undefined" ? UrlUtils.build(window.location.href, "https://liftosaur.com") : undefined;
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
    // window.addEventListener("keypress", (e) => {
    //   if (e.key === "r") {
    //     const progress = stateRef.current.progress[0];
    //     const currentEntryIndex = progress?.ui?.currentEntryIndex ?? 0;
    //     const currentEntry = progress?.entries[currentEntryIndex];
    //     const setIndex = currentEntry ? Reps.findNextSetIndex(currentEntry) : 0;
    //     window.postMessage({ type: "completeSet", entryIndex: currentEntryIndex, setIndex }, "*");
    //   }
    // });
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
            [Progress_lbProgress().pi("ui").p("nativeNotificationScheduled").record(true)],
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

    if (currentProgram != null && currentProgram.planner == null) {
      alert(
        "You're using OLD STYLE programs, which won't be supported, and WILL STOP WORKING starting from Feb 3, 2025! Please go to Program screen, and migrate the program to the new style"
      );
    }

    if (state.storage.history.length === 0) {
      ImagePreloader.preload(ImagePreloader.dynocoach);
    }

    Settings_applyTheme(state.storage.settings.theme || (window.lftSystemDarkMode ? "dark" : "light"));

    return () => {
      window.removeEventListener("error", onerror);
      window.removeEventListener("unhandledrejection", onunhandledexception);
    };
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-screen", Screen_currentName(state.screenStack));
  }, [state.screenStack]);

  const currentProgram =
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;

  const navCommon: INavCommon = {
    subscription: state.storage.subscription,
    screenStack: state.screenStack,
    doesHaveWorkouts: state.storage.history.length > 0,
    helps: state.storage.helps,
    loading: state.loading,
    currentProgram,
    allPrograms: state.storage.programs,
    settings: state.storage.settings,
    progress: Progress_getCurrentProgress(state),
    stats: state.storage.stats,
    userId: state.user?.id,
  };

  let content: JSX.Element;
  if (Screen_currentName(state.screenStack) === "first") {
    const userId = state.user?.id;
    const userEmail = state.user?.email;
    const account = userId && userEmail ? Account_getFromStorage(userId, userEmail, state.storage) : undefined;
    content = <ScreenFirst account={account} client={client} dispatch={dispatch} />;
  } else if (Screen_currentName(state.screenStack) === "units") {
    content = <ScreenUnitSelector settings={state.storage.settings} dispatch={dispatch} />;
  } else if (Screen_currentName(state.screenStack) === "subscription") {
    content = (
      <ScreenSubscription
        history={state.storage.history}
        prices={state.prices}
        offers={state.offers}
        appleOffer={state.appleOffer}
        googleOffer={state.googleOffer}
        subscription={state.storage.subscription}
        subscriptionLoading={state.subscriptionLoading}
        dispatch={dispatch}
        navCommon={navCommon}
      />
    );
  } else if (
    Screen_currentName(state.screenStack) === "programs" ||
    (Screen_currentName(state.screenStack) === "main" && currentProgram == null)
  ) {
    content = (
      <ChooseProgramView
        navCommon={navCommon}
        settings={state.storage.settings}
        dispatch={dispatch}
        progress={Progress_getProgress(state)}
        programs={state.programs || []}
        programsIndex={state.programsIndex || []}
        customPrograms={state.storage.programs || []}
        editProgramId={Progress_getProgress(state)?.programId}
      />
    );
  } else if (Screen_currentName(state.screenStack) === "main") {
    if (currentProgram != null) {
      content = (
        <ProgramHistoryView
          progress={Progress_getProgress(state)}
          navCommon={navCommon}
          program={currentProgram}
          settings={state.storage.settings}
          history={state.storage.history}
          subscription={state.storage.subscription}
          dispatch={dispatch}
        />
      );
    } else {
      throw new Error("Program is not selected on the 'main' screen");
    }
  } else if (Screen_currentName(state.screenStack) === "progress") {
    const progress = Progress_getProgress(state);
    const program = progress
      ? Progress_isCurrent(progress)
        ? Program_getFullProgram(state, progress.programId) ||
          (currentProgram ? Program_fullProgram(currentProgram, state.storage.settings) : undefined)
        : undefined
      : undefined;
    content = (
      <FallbackScreen state={{ progress }} dispatch={dispatch}>
        {({ progress: progress2 }) => (
          <ScreenWorkout
            navCommon={navCommon}
            stats={state.storage.stats}
            helps={state.storage.helps}
            history={state.storage.history}
            subscription={state.storage.subscription}
            userId={state.user?.id}
            progress={progress2}
            allPrograms={state.storage.programs}
            program={program}
            currentProgram={currentProgram}
            dispatch={dispatch}
            settings={state.storage.settings}
          />
        )}
      </FallbackScreen>
    );
  } else if (Screen_currentName(state.screenStack) === "settings") {
    content = (
      <ScreenSettings
        stats={state.storage.stats}
        tempUserId={state.storage.tempUserId}
        navCommon={navCommon}
        subscription={state.storage.subscription}
        dispatch={dispatch}
        user={state.user}
        currentProgramName={Program_getProgram(state, state.storage.currentProgramId)?.name || ""}
        settings={state.storage.settings}
      />
    );
  } else if (Screen_currentName(state.screenStack) === "programPreview") {
    if (state.previewProgram?.id == null) {
      setTimeout(() => {
        dispatch(Thunk_pullScreen());
      }, 0);
      content = <></>;
    } else {
      content = (
        <ScreenProgramPreview
          navCommon={navCommon}
          dispatch={dispatch}
          settings={state.storage.settings}
          selectedProgramId={state.previewProgram?.id}
          programs={state.previewProgram?.showCustomPrograms ? state.storage.programs : state.programs}
          subscription={state.storage.subscription}
        />
      );
    }
  } else if (Screen_currentName(state.screenStack) === "onerms") {
    if (currentProgram == null) {
      throw new Error("Opened 'exercises' screen, but 'currentProgram' is null");
    }
    content = (
      <Screen1RM navCommon={navCommon} dispatch={dispatch} program={currentProgram} settings={state.storage.settings} />
    );
  } else if (Screen_currentName(state.screenStack) === "stats") {
    content = (
      <ScreenStats
        navCommon={navCommon}
        dispatch={dispatch}
        settings={state.storage.settings}
        stats={state.storage.stats}
      />
    );
  } else if (Screen_currentName(state.screenStack) === "muscleGroups") {
    content = <ScreenMuscleGroups navCommon={navCommon} dispatch={dispatch} settings={state.storage.settings} />;
  } else if (Screen_currentName(state.screenStack) === "measurements") {
    content = (
      <ScreenMeasurements
        navCommon={navCommon}
        subscription={state.storage.subscription}
        dispatch={dispatch}
        settings={state.storage.settings}
        stats={state.storage.stats}
      />
    );
  } else if (Screen_currentName(state.screenStack) === "account") {
    content = <ScreenAccount navCommon={navCommon} dispatch={dispatch} email={state.user?.email} />;
  } else if (Screen_currentName(state.screenStack) === "exerciseStats") {
    const exercise = state.viewExerciseType
      ? Exercise_find(state.viewExerciseType, state.storage.settings.exercises)
      : undefined;
    if (exercise == null) {
      setTimeout(() => {
        dispatch(Thunk_pullScreen());
      }, 0);
      content = <></>;
    } else {
      content = (
        <ScreenExerciseStats
          navCommon={navCommon}
          currentProgram={currentProgram}
          key={Exercise_toKey(exercise)}
          history={state.storage.history}
          dispatch={dispatch}
          exerciseType={exercise}
          settings={state.storage.settings}
          subscription={state.storage.subscription}
        />
      );
    }
  } else if (Screen_currentName(state.screenStack) === "timers") {
    content = <ScreenTimers navCommon={navCommon} dispatch={dispatch} timers={state.storage.settings.timers} />;
  } else if (Screen_currentName(state.screenStack) === "appleHealth") {
    content = <ScreenAppleHealthSettings navCommon={navCommon} dispatch={dispatch} settings={state.storage.settings} />;
  } else if (Screen_currentName(state.screenStack) === "googleHealth") {
    content = (
      <ScreenGoogleHealthSettings navCommon={navCommon} dispatch={dispatch} settings={state.storage.settings} />
    );
  } else if (Screen_currentName(state.screenStack) === "gyms") {
    content = (
      <ScreenGyms
        navCommon={navCommon}
        expandedEquipment={state.defaultEquipmentExpanded}
        dispatch={dispatch}
        settings={state.storage.settings}
      />
    );
  } else if (Screen_currentName(state.screenStack) === "setupequipment") {
    content = (
      <ScreenSetupEquipment
        stats={state.storage.stats}
        navCommon={navCommon}
        dispatch={dispatch}
        settings={state.storage.settings}
      />
    );
  } else if (Screen_currentName(state.screenStack) === "plates") {
    const allEquipment = Equipment_getEquipmentOfGym(state.storage.settings, state.selectedGymId);
    content = (
      <ScreenEquipment
        stats={state.storage.stats}
        navCommon={navCommon}
        allEquipment={allEquipment}
        expandedEquipment={state.defaultEquipmentExpanded}
        selectedGymId={state.selectedGymId}
        dispatch={dispatch}
        settings={state.storage.settings}
      />
    );
  } else if (Screen_currentName(state.screenStack) === "exercises") {
    if (currentProgram == null) {
      throw new Error("Opened 'exercises' screen, but 'currentProgram' is null");
    }
    content = (
      <ScreenExercises
        navCommon={navCommon}
        settings={state.storage.settings}
        dispatch={dispatch}
        program={currentProgram}
        history={state.storage.history}
      />
    );
  } else if (Screen_currentName(state.screenStack) === "graphs") {
    content = (
      <ScreenGraphs
        navCommon={navCommon}
        settings={state.storage.settings}
        dispatch={dispatch}
        history={state.storage.history}
        stats={state.storage.stats}
      />
    );
  } else if (Screen_currentName(state.screenStack) === "editProgramExercise") {
    const screenData = Screen_current(navCommon.screenStack);
    const exerciseKey = screenData.name === "editProgramExercise" ? screenData.params?.key : undefined;
    const dayData = screenData.name === "editProgramExercise" ? screenData.params?.dayData : undefined;
    const plannerState = screenData.name === "editProgramExercise" ? screenData.params?.plannerState : undefined;
    content = (
      <FallbackScreen state={{ plannerState, exerciseKey, dayData }} dispatch={dispatch}>
        {({ plannerState: plannerState2, exerciseKey: exerciseKey2, dayData: dayData2 }) => (
          <ScreenEditProgramExercise
            plannerState={plannerState2}
            exerciseKey={exerciseKey2}
            dayData={dayData2}
            dispatch={dispatch}
            settings={state.storage.settings}
            navCommon={navCommon}
          />
        )}
      </FallbackScreen>
    );
  } else if (Screen_currentName(state.screenStack) === "editProgram") {
    const screenData = Screen_current(navCommon.screenStack);
    const plannerState = screenData.name === "editProgram" ? screenData.params?.plannerState : undefined;
    const editProgram = Program_getProgram(
      state,
      plannerState ? plannerState.current.program.id : Progress_getProgress(state)?.programId
    );
    content = (
      <FallbackScreen state={{ plannerState, editProgram }} dispatch={dispatch}>
        {({ plannerState: plannerState2, editProgram: editProgram2 }) => (
          <ScreenEditProgram
            client={client}
            helps={state.storage.helps}
            navCommon={navCommon}
            subscription={state.storage.subscription}
            settings={state.storage.settings}
            dispatch={dispatch}
            originalProgram={editProgram2}
            plannerState={plannerState2}
            revisions={(state.revisions || {})[editProgram2.id] || []}
            isLoggedIn={state.user != null}
          />
        )}
      </FallbackScreen>
    );
  } else if (Screen_currentName(state.screenStack) === "finishDay") {
    content = (
      <ScreenFinishDay
        navCommon={navCommon}
        settings={state.storage.settings}
        dispatch={dispatch}
        history={state.storage.history}
        userId={state.user?.id}
      />
    );
  } else if (Screen_currentName(state.screenStack) === "muscles") {
    const type = state.muscleView || {
      type: "program",
      programId: state.storage.currentProgramId || state.storage.programs[0]?.id,
    };
    if (type.programId == null) {
      throw new Error("Opened 'muscles' screen, but 'state.storage.currentProgramId' is null");
    }
    let program = Program_getProgram(state, type.programId);
    if (program == null) {
      throw new Error("Opened 'muscles' screen, but 'program' is null");
    }
    program = Program_fullProgram(program, state.storage.settings);
    if (type.type === "program") {
      content = (
        <ScreenMusclesProgram
          navCommon={navCommon}
          dispatch={dispatch}
          program={program}
          settings={state.storage.settings}
        />
      );
    } else {
      content = (
        <ScreenMusclesDay
          navCommon={navCommon}
          dispatch={dispatch}
          program={program}
          day={type.day ?? 1}
          settings={state.storage.settings}
        />
      );
    }
  } else {
    Rollbar.error(`Unknown screen: ${state.screenStack.length > 0 ? Screen_currentName(state.screenStack) : "empty"}`);
    return null;
  }

  const progress = Progress_getProgress(state);
  const { lftAndroidSafeInsetTop, lftAndroidSafeInsetBottom } = window;
  const screensWithoutTimer: IScreen[] = ["subscription"];
  const isEligibleForThanks25 = Subscriptions_isEligibleForThanksgivingPromo(
    state.storage.history.length > 0,
    state.storage.subscription
  );
  const helps = state.storage.helps;
  return (
    <Fragment>
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
      <AppContext.Provider value={{ service, isApp: true }}>{content}</AppContext.Provider>
      {progress && screensWithoutTimer.indexOf(Screen_currentName(state.screenStack)) === -1 && (
        <RestTimer
          progress={progress}
          dispatch={dispatch}
          settings={state.storage.settings}
          subscription={state.storage.subscription}
        />
      )}
      <Notification dispatch={dispatch} notification={state.notification} />
      {shouldShowWhatsNew && state.storage.whatsNew != null && (
        <ModalWhatsnew lastDateStr={state.storage.whatsNew} onClose={() => WhatsNew_updateStorage(dispatch)} />
      )}
      {isEligibleForThanks25 && !helps.includes("thanks25") && (
        <ModalThanks25
          dispatch={dispatch}
          onClose={() => {
            updateState(
              dispatch,
              [
                lb<IState>()
                  .p("storage")
                  .p("helps")
                  .recordModify((help) => [...help, "thanks25"]),
              ],
              "Dismiss Thanksgiving 25% modal"
            );
          }}
        />
      )}
      {state.errors.corruptedstorage != null && (
        <ModalCorruptedState
          userId={state.errors.corruptedstorage?.userid}
          backup={state.errors.corruptedstorage?.backup || false}
          local={state.errors.corruptedstorage?.local}
          onReset={() =>
            updateState(
              dispatch,
              [lb<IState>().p("errors").p("corruptedstorage").record(undefined)],
              "Reset corrupted storage"
            )
          }
        />
      )}
      {state.showSignupRequest && (
        <ModalSignupRequest numberOfWorkouts={state.storage.history.length} dispatch={dispatch} />
      )}
    </Fragment>
  );
}
