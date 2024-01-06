import { h, JSX, Fragment } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { reducerWrapper, defaultOnActions, IAction } from "../ducks/reducer";
import { ProgramDayView } from "./programDay";
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
import { ScreenPlates } from "./screenPlates";
import { ScreenGraphs } from "./screenGraphs";
import { ScreenEditProgram } from "./screenEditProgram";
import { Progress } from "../models/progress";
import { IEnv, IState, updateState } from "../models/state";
import { ScreenFinishDay } from "./screenFinishDay";
import { ScreenMusclesProgram } from "./muscles/screenMusclesProgram";
import { ScreenMusclesDay } from "./muscles/screenMusclesDay";
import { ScreenStats } from "./screenStats";
import { ScreenFriends } from "./screenFriends";
import { ScreenFriendsAdd } from "./screenFriendsAdd";
import { Notification } from "./notification";
import { WhatsNew } from "../models/whatsnew";
import { ModalWhatsnew } from "./modalWhatsnew";
import { ScreenOnboarding } from "./screenOnboarding";
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
  const shouldShowWhatsNew = WhatsNew.doesHaveNewUpdates(state.storage.whatsNew) || state.showWhatsNew;

  useEffect(() => {
    SendMessage.toAndroid({ type: "setAlwaysOnDisplay", value: `${!!state.storage.settings.alwaysOnDisplay}` });
    SendMessage.toIos({ type: "setAlwaysOnDisplay", value: `${!!state.storage.settings.alwaysOnDisplay}` });
  }, [state.storage.settings.alwaysOnDisplay]);
  const lastPingRef = useRef<number>(Date.now());

  useEffect(() => {
    if (lastPingRef.current < Date.now() - 60 * 3 * 1000) {
      lastPingRef.current = Date.now();
      dispatch(Thunk.ping());
    }
  });

  useLoopCatcher();

  useEffect(() => {
    dispatch(Thunk.fetchStorage());
    window.addEventListener("click", (e) => {
      let button: HTMLElement | undefined;
      let el: HTMLElement | undefined = e.target as HTMLElement;
      while (el != null && el.getAttribute != null) {
        const element = el as HTMLElement;
        const classes = (element.getAttribute("class") || "").split(/\s+/);
        if (classes.some((cl) => cl.startsWith("ls-"))) {
          button = el;
          break;
        }
        el = el.parentNode as HTMLElement | undefined;
      }
      if (button != null) {
        const name = (button.getAttribute("class") || "").split(/\s+/).filter((c) => c.startsWith("ls-"))[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatch(Thunk.log(name));
      }
    });
    window.addEventListener("message", (event) => {
      if (event.data?.type === "setAppleReceipt") {
        dispatch(Thunk.setAppleReceipt(event.data.receipt));
      } else if (event.data?.type === "setGooglePurchaseToken") {
        dispatch(Thunk.setGooglePurchaseToken(event.data.productId, event.data.token));
      } else if (event.data?.type === "stopSubscriptionLoading") {
        updateState(dispatch, [lb<IState>().p("subscriptionLoading").record(undefined)]);
      } else if (event.data?.type === "universalLink") {
        ImportExporter.handleUniversalLink(dispatch, event.data.link, client);
      } else if (event.data?.type === "goBack") {
        dispatch(Thunk.pullScreen());
      } else if (event.data?.type === "setReferrer") {
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
    if (typeof window !== "undefined") {
      const url = UrlUtils.build(window.location.href, "https://liftosaur.com");
      const source = url.searchParams.get("s");
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
    }
    SendMessage.toIos({ type: "loaded" });
    SendMessage.toAndroid({ type: "loaded" });
  }, []);

  const currentProgram =
    state.storage.currentProgramId != null ? Program.getProgram(state, state.storage.currentProgramId) : undefined;

  let content: JSX.Element;
  if (Screen.current(state.screenStack) === "first") {
    content = <ScreenFirst dispatch={dispatch} />;
  } else if (Screen.current(state.screenStack) === "onboarding") {
    content = <ScreenOnboarding dispatch={dispatch} />;
  } else if (Screen.current(state.screenStack) === "subscription") {
    content = (
      <ScreenSubscription
        subscription={state.storage.subscription}
        subscriptionLoading={state.subscriptionLoading}
        dispatch={dispatch}
        loading={state.loading}
        screenStack={state.screenStack}
      />
    );
  } else if (
    Screen.current(state.screenStack) === "programs" ||
    (Screen.current(state.screenStack) === "main" && currentProgram == null)
  ) {
    content = (
      <ChooseProgramView
        loading={state.loading}
        settings={state.storage.settings}
        screenStack={state.screenStack}
        dispatch={dispatch}
        programs={state.programs || []}
        customPrograms={state.storage.programs || []}
        editProgramId={state.progress[0]?.programId}
      />
    );
  } else if (Screen.current(state.screenStack) === "main") {
    if (currentProgram != null) {
      content = (
        <ProgramHistoryView
          editProgramId={state.progress[0]?.programId}
          screenStack={state.screenStack}
          comments={state.comments}
          likes={state.likes}
          loading={state.loading}
          program={currentProgram}
          progress={state.progress?.[0]}
          userId={state.user?.id}
          friendsHistory={state.friendsHistory}
          stats={state.storage.stats}
          settings={state.storage.settings}
          history={state.storage.history}
          dispatch={dispatch}
        />
      );
    } else {
      throw new Error("Program is not selected on the 'main' screen");
    }
  } else if (Screen.current(state.screenStack) === "progress") {
    const progress = state.progress[state.currentHistoryRecord!]!;
    if (state.currentHistoryRecordUserId && state.friendsHistory[state.currentHistoryRecordUserId]) {
      const friend = state.friendsHistory[state.currentHistoryRecordUserId]!;
      content = (
        <ProgramDayView
          friends={state.allFriends}
          loading={state.loading}
          helps={state.storage.helps}
          subscription={state.storage.subscription}
          likes={state.likes}
          comments={state.comments}
          userId={state.user?.id}
          history={[]}
          friend={friend}
          progress={progress}
          program={undefined}
          dispatch={dispatch}
          nickname={state.storage.settings.nickname}
          settings={friend.storage.settings}
          screenStack={state.screenStack}
        />
      );
    } else {
      const program = Progress.isCurrent(progress)
        ? Program.getProgram(state, progress.programId) || currentProgram
        : undefined;
      content = (
        <ProgramDayView
          friends={state.allFriends}
          nickname={state.storage.settings.nickname}
          helps={state.storage.helps}
          loading={state.loading}
          history={state.storage.history}
          subscription={state.storage.subscription}
          userId={state.user?.id}
          progress={progress}
          program={program}
          comments={state.comments}
          likes={state.likes}
          dispatch={dispatch}
          settings={state.storage.settings}
          screenStack={state.screenStack}
        />
      );
    }
  } else if (Screen.current(state.screenStack) === "settings") {
    content = (
      <ScreenSettings
        loading={state.loading}
        screenStack={state.screenStack}
        dispatch={dispatch}
        user={state.user}
        currentProgramName={Program.getProgram(state, state.storage.currentProgramId)?.name || ""}
        settings={state.storage.settings}
      />
    );
  } else if (Screen.current(state.screenStack) === "friends") {
    content = (
      <ScreenFriends
        screenStack={state.screenStack}
        loading={state.loading}
        allFriends={state.allFriends}
        dispatch={dispatch}
      />
    );
  } else if (Screen.current(state.screenStack) === "programPreview") {
    if (state.previewProgram?.id == null) {
      setTimeout(() => {
        dispatch(Thunk.pullScreen());
      }, 0);
      content = <></>;
    } else {
      content = (
        <ScreenProgramPreview
          screenStack={state.screenStack}
          loading={state.loading}
          dispatch={dispatch}
          settings={state.storage.settings}
          selectedProgramId={state.previewProgram?.id}
          programs={state.previewProgram?.showCustomPrograms ? state.storage.programs : state.programs}
          subscription={state.storage.subscription}
        />
      );
    }
  } else if (Screen.current(state.screenStack) === "friendsAdd") {
    content = (
      <ScreenFriendsAdd
        screenStack={state.screenStack}
        loading={state.loading}
        allFriends={state.allFriends}
        dispatch={dispatch}
      />
    );
  } else if (Screen.current(state.screenStack) === "stats") {
    content = (
      <ScreenStats
        screenStack={state.screenStack}
        loading={state.loading}
        dispatch={dispatch}
        settings={state.storage.settings}
        stats={state.storage.stats}
      />
    );
  } else if (Screen.current(state.screenStack) === "measurements") {
    content = (
      <ScreenMeasurements
        loading={state.loading}
        screenStack={state.screenStack}
        subscription={state.storage.subscription}
        dispatch={dispatch}
        settings={state.storage.settings}
        stats={state.storage.stats}
      />
    );
  } else if (Screen.current(state.screenStack) === "account") {
    content = (
      <ScreenAccount
        screenStack={state.screenStack}
        loading={state.loading}
        dispatch={dispatch}
        email={state.user?.email}
      />
    );
  } else if (Screen.current(state.screenStack) === "exerciseStats") {
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
          key={Exercise.toKey(exercise)}
          history={state.storage.history}
          screenStack={state.screenStack}
          loading={state.loading}
          dispatch={dispatch}
          exerciseType={state.viewExerciseType}
          settings={state.storage.settings}
          subscription={state.storage.subscription}
        />
      );
    }
  } else if (Screen.current(state.screenStack) === "timers") {
    content = (
      <ScreenTimers
        screenStack={state.screenStack}
        loading={state.loading}
        dispatch={dispatch}
        timers={state.storage.settings.timers}
      />
    );
  } else if (Screen.current(state.screenStack) === "plates") {
    content = (
      <ScreenPlates
        screenStack={state.screenStack}
        expandedEquipment={state.defaultEquipmentExpanded}
        loading={state.loading}
        dispatch={dispatch}
        settings={state.storage.settings}
      />
    );
  } else if (Screen.current(state.screenStack) === "graphs") {
    content = (
      <ScreenGraphs
        screenStack={state.screenStack}
        loading={state.loading}
        settings={state.storage.settings}
        dispatch={dispatch}
        history={state.storage.history}
        stats={state.storage.stats}
      />
    );
  } else if (Screen.editProgramScreens.indexOf(Screen.current(state.screenStack)) !== -1) {
    let editProgram = Program.getEditingProgram(state);
    editProgram = editProgram || Program.getProgram(state, state.progress[0]?.programId);
    if (editProgram != null) {
      content = (
        <ScreenEditProgram
          loading={state.loading}
          adminKey={state.adminKey}
          subscription={state.storage.subscription}
          screenStack={state.screenStack}
          settings={state.storage.settings}
          editExercise={state.editExercise}
          dispatch={dispatch}
          programIndex={Program.getEditingProgramIndex(state)}
          dayIndex={Math.min(state.editProgram?.dayIndex ?? state.progress[0]?.day ?? 0, editProgram.days.length - 1)}
          weekIndex={state.editProgram?.weekIndex}
          editProgram={editProgram}
        />
      );
    } else {
      throw new Error("Opened 'editProgram' screen, but 'state.editProgram' is null");
    }
  } else if (Screen.current(state.screenStack) === "finishDay") {
    content = (
      <ScreenFinishDay
        screenStack={state.screenStack}
        loading={state.loading}
        settings={state.storage.settings}
        dispatch={dispatch}
        history={state.storage.history}
        userId={state.user?.id}
      />
    );
  } else if (Screen.current(state.screenStack) === "muscles") {
    const type = state.muscleView || {
      type: "program",
      programId: state.storage.currentProgramId || state.storage.programs[0]?.id,
    };
    if (type.programId == null) {
      throw new Error("Opened 'muscles' screen, but 'state.storage.currentProgramId' is null");
    }
    const program = Program.getProgram(state, type.programId);
    if (program == null) {
      throw new Error("Opened 'muscles' screen, but 'program' is null");
    }
    if (type.type === "program") {
      content = (
        <ScreenMusclesProgram
          loading={state.loading}
          dispatch={dispatch}
          screenStack={state.screenStack}
          program={program}
          settings={state.storage.settings}
        />
      );
    } else {
      const day = program.days[type.dayIndex ?? 0];
      content = (
        <ScreenMusclesDay
          screenStack={state.screenStack}
          loading={state.loading}
          dispatch={dispatch}
          program={program}
          programDay={day}
          settings={state.storage.settings}
        />
      );
    }
  } else {
    return null;
  }

  const progress = state.progress[state.currentHistoryRecord!];
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
      {progress && screensWithoutTimer.indexOf(Screen.current(state.screenStack)) === -1 && (
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
