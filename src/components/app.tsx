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
import { IEnv, INavCommon, IState, updateState } from "../models/state";
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

declare let Rollbar: RB;

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dispatch(Thunk.log(lsName));
        }
      }
    });
    window.addEventListener("message", (event) => {
      if (event.data?.type === "setAppleReceipt") {
        dispatch(Thunk.setAppleReceipt(event.data.receipt));
      } else if (event.data?.type === "setGooglePurchaseToken") {
        dispatch(Thunk.setGooglePurchaseToken(event.data.productId, event.data.token));
      } else if (event.data?.type === "loaded") {
        dispatch(Thunk.postevent("loaded"));
        dispatch(Thunk.syncHealthKit());
      } else if (event.data?.type === "wake") {
        dispatch(Thunk.sync2({ force: true }));
        dispatch(Thunk.syncHealthKit());
      } else if (event.data?.type === "syncToAppleHealthError") {
        dispatch(Thunk.postevent("apple-health-error"));
        alert(event.data.error);
      } else if (event.data?.type === "stopSubscriptionLoading") {
        updateState(dispatch, [lb<IState>().p("subscriptionLoading").record(undefined)]);
      } else if (event.data?.type === "products") {
        const newPrices = { ...state.prices, ...event.data.data };
        updateState(dispatch, [lb<IState>().p("prices").record(newPrices)]);
      } else if (event.data?.type === "universalLink") {
        ImportExporter.handleUniversalLink(dispatch, event.data.link, client);
      } else if (event.data?.type === "goBack") {
        dispatch(Thunk.pullScreen());
      } else if (event.data?.type === "setReferrer") {
        dispatch(Thunk.postevent("set-referrer"));
        updateState(
          dispatch,
          [
            lb<IState>()
              .p("storage")
              .p("referrer")
              .record(event.data?.data || undefined),
          ],
          "Set Referrer"
        );
      } else if (event.data?.type === "requestedReview") {
        dispatch(Thunk.postevent("requested-review"));
        updateState(dispatch, [
          lb<IState>()
            .p("storage")
            .p("reviewRequests")
            .recordModify((r) => [...r, Date.now()]),
        ]);
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
              message: message || "",
              stack: reason.stack || "",
              rollbar_id: uuid || "",
            });
          }
        });
      }
    };
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
    screenStack: state.screenStack,
    loading: state.loading,
    currentProgram,
    allPrograms: state.storage.programs,
    settings: state.storage.settings,
    progress: state.progress[0],
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
        prices={state.prices}
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
        progress={state.progress[0]}
        programs={state.programs || []}
        customPrograms={state.storage.programs || []}
        editProgramId={state.progress[0]?.programId}
      />
    );
  } else if (Screen.currentName(state.screenStack) === "main") {
    if (currentProgram != null) {
      content = (
        <ProgramHistoryView
          progress={state.progress[0]}
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
    const progress = Progress.getProgress(state)!;
    const program = Progress.isCurrent(progress)
      ? Program.getFullProgram(state, progress.programId) ||
        (currentProgram ? Program.fullProgram(currentProgram, state.storage.settings) : undefined)
      : undefined;
    content = (
      <ScreenWorkout
        navCommon={navCommon}
        helps={state.storage.helps}
        history={state.storage.history}
        subscription={state.storage.subscription}
        userId={state.user?.id}
        progress={progress}
        allPrograms={state.storage.programs}
        program={program}
        dispatch={dispatch}
        settings={state.storage.settings}
      />
    );
  } else if (Screen.currentName(state.screenStack) === "settings") {
    content = (
      <ScreenSettings
        stats={state.storage.stats}
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
  } else if (Screen.currentName(state.screenStack) === "stats") {
    content = (
      <ScreenStats
        navCommon={navCommon}
        dispatch={dispatch}
        settings={state.storage.settings}
        stats={state.storage.stats}
      />
    );
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
  } else if (Screen.currentName(state.screenStack) === "plates") {
    const allEquipment = Equipment.getEquipmentOfGym(state.storage.settings, state.selectedGymId);
    content = (
      <ScreenEquipment
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
  } else if (Screen.editProgramScreens.indexOf(Screen.currentName(state.screenStack)) !== -1) {
    let editProgram = Program.getEditingProgram(state);
    editProgram = editProgram || Program.getProgram(state, state.progress[0]?.programId);
    content = (
      <ScreenEditProgram
        client={client}
        helps={state.storage.helps}
        navCommon={navCommon}
        adminKey={state.adminKey}
        subscription={state.storage.subscription}
        settings={state.storage.settings}
        dispatch={dispatch}
        originalProgram={editProgram}
        plannerState={state.editProgramV2}
        revisions={editProgram ? (state.revisions || {})[editProgram.id] || [] : []}
        isLoggedIn={state.user != null}
      />
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
      {content}
      {progress && screensWithoutTimer.indexOf(Screen.currentName(state.screenStack)) === -1 && (
        <RestTimer progress={progress} dispatch={dispatch} />
      )}
      <Notification dispatch={dispatch} notification={state.notification} />
      {shouldShowWhatsNew && state.storage.whatsNew != null && (
        <ModalWhatsnew lastDateStr={state.storage.whatsNew} onClose={() => WhatsNew.updateStorage(dispatch)} />
      )}
      {state.errors.corruptedstorage != null && (
        <ModalCorruptedState
          userId={state.errors.corruptedstorage?.userid}
          backup={state.errors.corruptedstorage?.backup || false}
          local={state.errors.corruptedstorage?.local}
          onReset={() => updateState(dispatch, [lb<IState>().p("errors").p("corruptedstorage").record(undefined)])}
        />
      )}
      {state.showSignupRequest && (
        <ModalSignupRequest numberOfWorkouts={state.storage.history.length} dispatch={dispatch} />
      )}
    </Fragment>
  );
}
