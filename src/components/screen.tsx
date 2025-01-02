import React, { JSX, useEffect, useState } from "react";
import { ProgramDayView } from "./programDay";
import { ChooseProgramView } from "./chooseProgram";
import { ProgramHistoryView } from "./programHistory";
import { Program } from "../models/program";
import { IScreen, Screen } from "../models/screen";
import { ScreenSettings } from "./screenSettings";
import { ScreenAccount } from "./screenAccount";
import { Thunk } from "../ducks/thunks";
import { ScreenTimers } from "./screenTimers";
import { ScreenEquipment } from "./screenEquipment";
import { ScreenGraphs } from "./screenGraphs";
import { ScreenEditProgram } from "./screenEditProgram";
import { Progress } from "../models/progress";
import { IEnv, IState, updateState } from "../models/state";
import { ScreenFinishDay } from "./screenFinishDay";
import { ScreenMusclesProgram } from "./muscles/screenMusclesProgram";
import { ScreenMusclesDay } from "./muscles/screenMusclesDay";
import { ScreenStats } from "./screenStats";
import { Notification } from "./notification";
import { WhatsNew } from "../models/whatsnew";
import { ModalWhatsnew } from "./modalWhatsnew";
import { ScreenOnboarding } from "./screenOnboarding";
import { ScreenMeasurements } from "./screenMeasurements";
import { ScreenSubscription } from "./screenSubscription";
import { lb } from "lens-shmens";
import { ScreenProgramPreview } from "./screenProgramPreview";
import { ScreenExerciseStats } from "./screenExerciseStats";
import { Exercise } from "../models/exercise";
import { RestTimer } from "./restTimer";
import { ScreenFirst } from "./screenFirst";
import { ModalSignupRequest } from "./modalSignupRequest";
import { ModalCorruptedState } from "./modalCorruptedState";
import { Equipment } from "../models/equipment";
import { ScreenGyms } from "./screenGyms";
import { ScreenExercises } from "./screenExercises";
import { ScreenAppleHealthSettings } from "./screenAppleHealthSettings";
import { ScreenGoogleHealthSettings } from "./screenGoogleHealthSettings";
import { ScreenUnitSelector } from "./screenUnitSelector";
import { IDispatch } from "../ducks/types";
import { reducer } from "../ducks/reducer";
import { useThunkReducer } from "../utils/useThunkReducer";

interface IScreenViewWrapperProps {
  state: IState;
  env: IEnv;
}

export function ScreenViewWrapper(props: IScreenViewWrapperProps): JSX.Element {
  const [state, dispatch] = useThunkReducer(reducer, props.state, props.env, [
    (d, action, oldState, newState) => {
      if (typeof action !== "function" && !(action.type === "ReplaceState" && action.desc === "Update")) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: "ReplaceState", state: newState }));
      }
    },
  ]);

  useEffect(() => {
    window.replaceState = (newState: IState) => {
      dispatch({ type: "ReplaceState", state: newState, desc: "Update" });
    };
  }, []);

  return <ScreenView state={state} dispatch={dispatch} />;
}

interface IScreenViewProps {
  state: IState;
  dispatch: IDispatch;
}

export function ScreenView(props: IScreenViewProps): JSX.Element | null {
  const { state, dispatch } = props;
  console.log("A", state.progress?.[0]?.ui?.amrapModal);
  const shouldShowWhatsNew = WhatsNew.doesHaveNewUpdates(state.storage.whatsNew) || state.showWhatsNew;
  const currentProgram =
    state.storage.currentProgramId != null ? Program.getProgram(state, state.storage.currentProgramId) : undefined;

  let content: JSX.Element;
  if (Screen.current(state.screenStack) === "first") {
    content = <ScreenFirst dispatch={dispatch} />;
  } else if (Screen.current(state.screenStack) === "onboarding") {
    content = <ScreenOnboarding dispatch={dispatch} />;
  } else if (Screen.current(state.screenStack) === "units") {
    content = <ScreenUnitSelector dispatch={dispatch} />;
  } else if (Screen.current(state.screenStack) === "subscription") {
    content = (
      <ScreenSubscription
        prices={state.prices}
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
          loading={state.loading}
          allPrograms={state.storage.programs}
          program={currentProgram}
          progress={state.progress?.[0]}
          userId={state.user?.id}
          stats={state.storage.stats}
          settings={state.storage.settings}
          history={state.storage.history}
          subscription={state.storage.subscription}
          dispatch={dispatch}
        />
      );
    } else {
      throw new Error("Program is not selected on the 'main' screen");
    }
  } else if (Screen.current(state.screenStack) === "progress") {
    const progress = state.progress[state.currentHistoryRecord!]!;
    const program = Progress.isCurrent(progress)
      ? Program.getFullProgram(state, progress.programId) ||
        (currentProgram ? Program.fullProgram(currentProgram, state.storage.settings) : undefined)
      : undefined;
    content = (
      <ProgramDayView
        helps={state.storage.helps}
        loading={state.loading}
        history={state.storage.history}
        subscription={state.storage.subscription}
        userId={state.user?.id}
        progress={progress}
        program={program}
        dispatch={dispatch}
        settings={state.storage.settings}
        screenStack={state.screenStack}
      />
    );
  } else if (Screen.current(state.screenStack) === "settings") {
    content = (
      <ScreenSettings
        loading={state.loading}
        screenStack={state.screenStack}
        subscription={state.storage.subscription}
        dispatch={dispatch}
        user={state.user}
        currentProgramName={Program.getProgram(state, state.storage.currentProgramId)?.name || ""}
        settings={state.storage.settings}
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
          currentProgram={currentProgram}
          key={Exercise.toKey(exercise)}
          history={state.storage.history}
          screenStack={state.screenStack}
          loading={state.loading}
          dispatch={dispatch}
          exerciseType={exercise}
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
  } else if (Screen.current(state.screenStack) === "appleHealth") {
    content = (
      <ScreenAppleHealthSettings
        screenStack={state.screenStack}
        loading={state.loading}
        dispatch={dispatch}
        settings={state.storage.settings}
      />
    );
  } else if (Screen.current(state.screenStack) === "googleHealth") {
    content = (
      <ScreenGoogleHealthSettings
        screenStack={state.screenStack}
        loading={state.loading}
        dispatch={dispatch}
        settings={state.storage.settings}
      />
    );
  } else if (Screen.current(state.screenStack) === "gyms") {
    content = (
      <ScreenGyms
        screenStack={state.screenStack}
        expandedEquipment={state.defaultEquipmentExpanded}
        loading={state.loading}
        dispatch={dispatch}
        settings={state.storage.settings}
      />
    );
  } else if (Screen.current(state.screenStack) === "plates") {
    const allEquipment = Equipment.getEquipmentOfGym(state.storage.settings, state.selectedGymId);
    content = (
      <ScreenEquipment
        allEquipment={allEquipment}
        screenStack={state.screenStack}
        expandedEquipment={state.defaultEquipmentExpanded}
        selectedGymId={state.selectedGymId}
        loading={state.loading}
        dispatch={dispatch}
        settings={state.storage.settings}
      />
    );
  } else if (Screen.current(state.screenStack) === "exercises") {
    if (currentProgram == null) {
      throw new Error("Opened 'exercises' screen, but 'currentProgram' is null");
    }
    content = (
      <ScreenExercises
        screenStack={state.screenStack}
        loading={state.loading}
        settings={state.storage.settings}
        dispatch={dispatch}
        program={currentProgram}
        history={state.storage.history}
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
          helps={state.storage.helps}
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
          plannerState={state.editProgramV2}
          isLoggedIn={state.user != null}
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
    let program = Program.getProgram(state, type.programId);
    if (program == null) {
      throw new Error("Opened 'muscles' screen, but 'program' is null");
    }
    program = Program.fullProgram(program, state.storage.settings);
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
    <>
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
      <div>Blah</div>
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
    </>
  );
}
