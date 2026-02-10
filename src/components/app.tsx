import { h, JSX, Fragment } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { reducerWrapper, defaultOnActions, IAction } from "../ducks/reducer";
import { ChooseProgramView } from "./chooseProgram";
import { ProgramHistoryView } from "./programHistory";
import { Program } from "../models/program";
import { IScreen, Screen } from "../models/screen";
import { ScreenSettings } from "./screenSettings";
import { ScreenAccount } from "./screenAccount";
import { useThunkReducer } from "../utils/useThunkReducer";
import { Thunk } from "../ducks/thunks";
import { Service } from "../api/service";
import { IAudioInterface } from "../lib/audioInterface";
import { ScreenTimers } from "./screenTimers";
import { ScreenEquipment } from "./screenEquipment";
import { ScreenGraphs } from "./screenGraphs";
import { ScreenEditProgram } from "./screenEditProgram";
import { Progress } from "../models/progress";
import { IAttributionData, IEnv, INavCommon, IState, updateState } from "../models/state";
import { ScreenFinishDay } from "./screenFinishDay";
import { ScreenMusclesProgram } from "./muscles/screenMusclesProgram";
import { ScreenMusclesDay } from "./muscles/screenMusclesDay";
import { ScreenStats } from "./screenStats";
import { Notification } from "./notification";
import { WhatsNew } from "../models/whatsnew";
import { ModalWhatsnew } from "./modalWhatsnew";
import { ScreenMeasurements } from "./screenMeasurements";
import { ScreenSubscription } from "./screenSubscription";
import { Subscriptions } from "../utils/subscriptions";
import { lb } from "lens-shmens";
import { ScreenProgramPreview } from "./screenProgramPreview";
import { ScreenExerciseStats } from "./screenExerciseStats";
import { Exercise } from "../models/exercise";
import { RestTimer } from "./restTimer";
import { ScreenFirst } from "./screenFirst";
import { ImportExporter } from "../lib/importexporter";
import { ModalSignupRequest } from "./modalSignupRequest";
import { SendMessage } from "../utils/sendMessage";
import { ModalCorruptedState } from "./modalCorruptedState";
import { UrlUtils } from "../utils/url";
import { AsyncQueue } from "../utils/asyncQueue";
import { useLoopCatcher } from "../utils/useLoopCatcher";
import { Equipment } from "../models/equipment";
import { ScreenGyms } from "./screenGyms";
import { ScreenExercises } from "./screenExercises";
import { ScreenAppleHealthSettings } from "./screenAppleHealthSettings";
import { ScreenGoogleHealthSettings } from "./screenGoogleHealthSettings";
import { ScreenUnitSelector } from "./screenUnitSelector";
import RB from "rollbar";
import { exceptionIgnores } from "../utils/rollbar";
import { ScreenWorkout } from "./screenWorkout";
import { Account } from "../models/account";
import { ImagePreloader } from "../utils/imagePreloader";
import { ScreenEditProgramExercise } from "./editProgramExercise/screenEditProgramExercise";
import { FallbackScreen } from "./fallbackScreen";
import { Screen1RM } from "./screen1RM";
import { ScreenSetupEquipment } from "./screenSetupEquipment";
import { Settings } from "../models/settings";
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
  const shouldShowWhatsNew = WhatsNew.doesHaveNewUpdates(state.storage.whatsNew) || state.showWhatsNew;

  useEffect(() => {
    SendMessage.toAndroid({ type: "setAlwaysOnDisplay", value: `${!!state.storage.settings.alwaysOnDisplay}` });
    SendMessage.toIos({ type: "setAlwaysOnDisplay", value: `${!!state.storage.settings.alwaysOnDisplay}` });
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
      dispatch(Thunk.fetchStorage(storageId));
    } else {
      dispatch(Thunk.sync2({ force: true }));
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
        dispatch(Thunk.postevent("click-" + name));
        if (lsName) {
          dispatch(Thunk.log(lsName));
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
        dispatch(Thunk.setAppleReceipt(event.data.receipt));
      } else if (event.data?.type === "setGooglePurchaseToken") {
        dispatch(Thunk.setGooglePurchaseToken(event.data.productId, event.data.token));
      } else if (event.data?.type === "loaded") {
        dispatch(Thunk.postevent("loaded"));
        dispatch(Thunk.syncHealthKit());
      } else if (event.data?.type === "wake") {
        dispatch(Thunk.postevent("wake"));
        queue.clearStaleOperations();
        dispatch(Thunk.sync2({ force: true }));
        dispatch(Thunk.syncHealthKit());
      } else if (event.data?.type === "syncToAppleHealthError") {
        dispatch(Thunk.postevent("apple-health-error"));
        alert(event.data.error);
      } else if (event.data?.type === "stopSubscriptionLoading") {
        updateState(dispatch, [lb<IState>().p("subscriptionLoading").record(undefined)], "Stop subscription loading");
      } else if (event.data?.type === "products") {
        dispatch(Thunk.postevent("sync-prices"));
        const newPrices = { ...state.prices, ...event.data.data };
        const newOffers = { ...state.offers, ...event.data.offers };
        updateState(
          dispatch,
          [lb<IState>().p("prices").record(newPrices), lb<IState>().p("offers").record(newOffers)],
          "Update prices for products"
        );
      } else if (event.data?.type === "universalLink") {
        ImportExporter.handleUniversalLink(dispatch, event.data.link, client);
      } else if (event.data?.type === "goBack") {
        dispatch(Thunk.postevent("go-back"));
        dispatch(Thunk.pullScreen());
      } else if (event.data?.type === "attribution") {
        if (event.data?.data != null && !event.data?.data.isOrganic) {
          const data = event.data?.data as IAttributionData;
          const referrer = `${data.mediaSource}_${data.campaign}`;
          if (state.storage.referrer !== referrer) {
            dispatch(Thunk.postevent("set-referrer", { referrer }));
            updateState(dispatch, [lb<IState>().p("storage").p("referrer").record(referrer)], "Set Referrer");
          }
        }
      } else if (event.data?.type === "requestedReview") {
        dispatch(Thunk.postevent("requested-review"));
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
        SendMessage.print("Main app: Received completeSet message");
        const entryIndex = event.data.entryIndex as number;
        const setIndex = event.data.setIndex as number;
        const restTimer = event.data.restTimer as number;
        const restTimerSince = event.data.restTimerSince as number;
        dispatch(Thunk.completeSetExternal(entryIndex, setIndex, restTimer, restTimerSince));
      } else if (event.data?.type === "adjustRestTimer") {
        const action = event.data.action as "increase" | "decrease";
        const incomingRestTimer = event.data.restTimer as number;
        const incomingRestTimerSince = event.data.restTimerSince as number;
        const entryIndex = event.data.entryIndex as number;
        const setIndex = event.data.setIndex as number;
        const progress = stateRef.current.storage.progress[0];
        const skipLiveActivityUpdate = !!event.data.skipLiveActivityUpdate;
        if (progress == null) {
          SendMessage.print("Main app: No active workout to adjust rest timer");
          return;
        }
        const { timer, timerSince } = progress;
        SendMessage.print(`Main app: ${action === "increase" ? "Increasing" : "Decreasing"} rest timer by 15 seconds`);
        SendMessage.print(`Main app: Current timer: ${timer}, since: ${timerSince}`);
        if (timer == null || timerSince == null) {
          return;
        }
        if (incomingRestTimer !== timer || incomingRestTimerSince !== timerSince) {
          SendMessage.print(
            `Main app: Incoming rest timer data does not match current state, refreshing live activity. ${incomingRestTimer} != ${timer} || ${incomingRestTimerSince} != ${timerSince}`
          );
          if (!skipLiveActivityUpdate) {
            dispatch(Thunk.updateLiveActivity(entryIndex, setIndex, timer, timerSince));
          }
        } else {
          dispatch(
            Thunk.updateTimer(
              action === "increase" ? timer + 15 : Math.max(0, timer - 15),
              entryIndex,
              setIndex,
              skipLiveActivityUpdate
            )
          );
        }
      } else if (event.data?.type === "timerScheduled") {
        if (Progress.getCurrentProgress(stateRef.current)?.ui) {
          SendMessage.print(`Main app: Marking native notification as scheduled`);
          updateState(
            dispatch,
            [Progress.lbProgress().pi("ui").p("nativeNotificationScheduled").record(true)],
            "Set native notification scheduled"
          );
        }
      } else if (event.data?.type === "watchStorageMerge") {
        const storageJson = event.data.storage as string;
        const isLiveActivity = !!event.data.isLiveActivity;
        dispatch(Thunk.handleWatchStorageMerge(storageJson, isLiveActivity));
      } else if (event.data?.type === "reloadStorageFromDisk") {
        dispatch(Thunk.reloadStorageFromDisk());
      }
    });
    const userId = state.user?.id || state.storage.tempUserId;
    Subscriptions.cleanupOutdatedAppleReceipts(dispatch, userId, service, state.storage.subscription);
    Subscriptions.cleanupOutdatedGooglePurchaseTokens(dispatch, userId, service, state.storage.subscription);
    dispatch(Thunk.fetchInitial());
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
    SendMessage.toIos({ type: "loaded", userid: userId });
    SendMessage.toAndroid({ type: "loaded", userid: userId });

    if (currentProgram != null && currentProgram.planner == null) {
      alert(
        "You're using OLD STYLE programs, which won't be supported, and WILL STOP WORKING starting from Feb 3, 2025! Please go to Program screen, and migrate the program to the new style"
      );
    }

    if (state.storage.history.length === 0) {
      ImagePreloader.preload(ImagePreloader.dynocoach);
    }

    Settings.applyTheme(state.storage.settings.theme || (window.lftSystemDarkMode ? "dark" : "light"));

    return () => {
      window.removeEventListener("error", onerror);
      window.removeEventListener("unhandledrejection", onunhandledexception);
    };
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-screen", Screen.currentName(state.screenStack));
  }, [state.screenStack]);

  const currentProgram =
    state.storage.currentProgramId != null ? Program.getProgram(state, state.storage.currentProgramId) : undefined;

  const navCommon: INavCommon = {
    subscription: state.storage.subscription,
    screenStack: state.screenStack,
    doesHaveWorkouts: state.storage.history.length > 0,
    helps: state.storage.helps,
    loading: state.loading,
    currentProgram,
    allPrograms: state.storage.programs,
    settings: state.storage.settings,
    progress: Progress.getCurrentProgress(state),
    stats: state.storage.stats,
    userId: state.user?.id,
  };

  let content: JSX.Element;
  if (Screen.currentName(state.screenStack) === "first") {
    const userId = state.user?.id;
    const userEmail = state.user?.email;
    const account = userId && userEmail ? Account.getFromStorage(userId, userEmail, state.storage) : undefined;
    content = <ScreenFirst account={account} client={client} dispatch={dispatch} />;
  } else if (Screen.currentName(state.screenStack) === "units") {
    content = <ScreenUnitSelector settings={state.storage.settings} dispatch={dispatch} />;
  } else if (Screen.currentName(state.screenStack) === "subscription") {
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
    Screen.currentName(state.screenStack) === "programs" ||
    (Screen.currentName(state.screenStack) === "main" && currentProgram == null)
  ) {
    content = (
      <ChooseProgramView
        navCommon={navCommon}
        settings={state.storage.settings}
        dispatch={dispatch}
        progress={Progress.getProgress(state)}
        programs={state.programs || []}
        customPrograms={state.storage.programs || []}
        editProgramId={Progress.getProgress(state)?.programId}
      />
    );
  } else if (Screen.currentName(state.screenStack) === "main") {
    if (currentProgram != null) {
      content = (
        <ProgramHistoryView
          progress={Progress.getProgress(state)}
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
  } else if (Screen.currentName(state.screenStack) === "progress") {
    const progress = Progress.getProgress(state);
    if (progress == null) {
      dispatch({ type: "PushScreen", screen: "main", shouldResetStack: true });
      return null;
    }
    const program = Progress.isCurrent(progress)
      ? Program.getFullProgram(state, progress.programId) ||
        (currentProgram ? Program.fullProgram(currentProgram, state.storage.settings) : undefined)
      : undefined;
    content = (
      <ScreenWorkout
        navCommon={navCommon}
        stats={state.storage.stats}
        helps={state.storage.helps}
        history={state.storage.history}
        subscription={state.storage.subscription}
        userId={state.user?.id}
        progress={progress}
        allPrograms={state.storage.programs}
        program={program}
        currentProgram={currentProgram}
        dispatch={dispatch}
        settings={state.storage.settings}
      />
    );
  } else if (Screen.currentName(state.screenStack) === "settings") {
    content = (
      <ScreenSettings
        stats={state.storage.stats}
        tempUserId={state.storage.tempUserId}
        navCommon={navCommon}
        subscription={state.storage.subscription}
        dispatch={dispatch}
        user={state.user}
        currentProgramName={Program.getProgram(state, state.storage.currentProgramId)?.name || ""}
        settings={state.storage.settings}
      />
    );
  } else if (Screen.currentName(state.screenStack) === "programPreview") {
    if (state.previewProgram?.id == null) {
      setTimeout(() => {
        dispatch(Thunk.pullScreen());
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
  } else if (Screen.currentName(state.screenStack) === "onerms") {
    if (currentProgram == null) {
      throw new Error("Opened 'exercises' screen, but 'currentProgram' is null");
    }
    content = (
      <Screen1RM navCommon={navCommon} dispatch={dispatch} program={currentProgram} settings={state.storage.settings} />
    );
  } else if (Screen.currentName(state.screenStack) === "stats") {
    content = (
      <ScreenStats
        navCommon={navCommon}
        dispatch={dispatch}
        settings={state.storage.settings}
        stats={state.storage.stats}
      />
    );
  } else if (Screen.currentName(state.screenStack) === "muscleGroups") {
    content = <ScreenMuscleGroups navCommon={navCommon} dispatch={dispatch} settings={state.storage.settings} />;
  } else if (Screen.currentName(state.screenStack) === "measurements") {
    content = (
      <ScreenMeasurements
        navCommon={navCommon}
        subscription={state.storage.subscription}
        dispatch={dispatch}
        settings={state.storage.settings}
        stats={state.storage.stats}
      />
    );
  } else if (Screen.currentName(state.screenStack) === "account") {
    content = <ScreenAccount navCommon={navCommon} dispatch={dispatch} email={state.user?.email} />;
  } else if (Screen.currentName(state.screenStack) === "exerciseStats") {
    const exercise = state.viewExerciseType
      ? Exercise.find(state.viewExerciseType, state.storage.settings.exercises)
      : undefined;
    if (exercise == null) {
      setTimeout(() => {
        dispatch(Thunk.pullScreen());
      }, 0);
      content = <></>;
    } else {
      content = (
        <ScreenExerciseStats
          navCommon={navCommon}
          currentProgram={currentProgram}
          key={Exercise.toKey(exercise)}
          history={state.storage.history}
          dispatch={dispatch}
          exerciseType={exercise}
          settings={state.storage.settings}
          subscription={state.storage.subscription}
        />
      );
    }
  } else if (Screen.currentName(state.screenStack) === "timers") {
    content = <ScreenTimers navCommon={navCommon} dispatch={dispatch} timers={state.storage.settings.timers} />;
  } else if (Screen.currentName(state.screenStack) === "appleHealth") {
    content = <ScreenAppleHealthSettings navCommon={navCommon} dispatch={dispatch} settings={state.storage.settings} />;
  } else if (Screen.currentName(state.screenStack) === "googleHealth") {
    content = (
      <ScreenGoogleHealthSettings navCommon={navCommon} dispatch={dispatch} settings={state.storage.settings} />
    );
  } else if (Screen.currentName(state.screenStack) === "gyms") {
    content = (
      <ScreenGyms
        navCommon={navCommon}
        expandedEquipment={state.defaultEquipmentExpanded}
        dispatch={dispatch}
        settings={state.storage.settings}
      />
    );
  } else if (Screen.currentName(state.screenStack) === "setupequipment") {
    content = (
      <ScreenSetupEquipment
        stats={state.storage.stats}
        navCommon={navCommon}
        dispatch={dispatch}
        settings={state.storage.settings}
      />
    );
  } else if (Screen.currentName(state.screenStack) === "plates") {
    const allEquipment = Equipment.getEquipmentOfGym(state.storage.settings, state.selectedGymId);
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
  } else if (Screen.currentName(state.screenStack) === "exercises") {
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
  } else if (Screen.currentName(state.screenStack) === "graphs") {
    content = (
      <ScreenGraphs
        navCommon={navCommon}
        settings={state.storage.settings}
        dispatch={dispatch}
        history={state.storage.history}
        stats={state.storage.stats}
      />
    );
  } else if (Screen.currentName(state.screenStack) === "editProgramExercise") {
    const screenData = Screen.current(navCommon.screenStack);
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
  } else if (Screen.currentName(state.screenStack) === "editProgram") {
    const screenData = Screen.current(navCommon.screenStack);
    const plannerState = screenData.name === "editProgram" ? screenData.params?.plannerState : undefined;
    const editProgram = Program.getProgram(
      state,
      plannerState ? plannerState.current.program.id : Progress.getProgress(state)?.programId
    );
    content = (
      <FallbackScreen state={{ plannerState, editProgram }} dispatch={dispatch}>
        {({ plannerState: plannerState2, editProgram: editProgram2 }) => (
          <ScreenEditProgram
            client={client}
            helps={state.storage.helps}
            navCommon={navCommon}
            adminKey={state.adminKey}
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
  } else if (Screen.currentName(state.screenStack) === "finishDay") {
    content = (
      <ScreenFinishDay
        navCommon={navCommon}
        settings={state.storage.settings}
        dispatch={dispatch}
        history={state.storage.history}
        userId={state.user?.id}
      />
    );
  } else if (Screen.currentName(state.screenStack) === "muscles") {
    const type = state.muscleView || {
      type: "program",
      programId: state.storage.currentProgramId || state.storage.programs[0]?.id,
    };
    if (type.programId == null) {
      throw new Error("Opened 'muscles' screen, but 'state.storage.currentProgramId' is null");
    }
    let program = Program.getProgram(state, type.programId);
    if (program == null) {
      throw new Error("Opened 'muscles' screen, but 'program' is null");
    }
    program = Program.fullProgram(program, state.storage.settings);
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
    return null;
  }

  const progress = Progress.getProgress(state);
  const { lftAndroidSafeInsetTop, lftAndroidSafeInsetBottom } = window;
  const screensWithoutTimer: IScreen[] = ["subscription"];
  const isEligibleForThanks25 = Subscriptions.isEligibleForThanksgivingPromo(
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
      {progress && screensWithoutTimer.indexOf(Screen.currentName(state.screenStack)) === -1 && (
        <RestTimer
          progress={progress}
          dispatch={dispatch}
          settings={state.storage.settings}
          subscription={state.storage.subscription}
        />
      )}
      <Notification dispatch={dispatch} notification={state.notification} />
      {shouldShowWhatsNew && state.storage.whatsNew != null && (
        <ModalWhatsnew lastDateStr={state.storage.whatsNew} onClose={() => WhatsNew.updateStorage(dispatch)} />
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
