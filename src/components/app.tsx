import { h, JSX, Fragment } from "preact";
import { useEffect, useState } from "preact/hooks";
import { reducerWrapper, IState } from "../ducks/reducer";
import { ProgramDayView } from "./programDay";
import { ChooseProgramView } from "./chooseProgram";
import { ProgramHistoryView } from "./programHistory";
import { Program } from "../models/program";
import { Screen } from "../models/screen";
import { ScreenSettings } from "./screenSettings";
import { ScreenAccount } from "./screenAccount";
import { useThunkReducer } from "../utils/useThunkReducer";
import { Thunk } from "../ducks/thunks";
import { Service } from "../api/service";
import { AudioInterface } from "../lib/audioInterface";
import { ScreenTimers } from "./screenTimers";
import { ScreenPlates } from "./screenPlates";
import { ModalOnboarding } from "./modalOnboarding";
import { ScreenGraphs } from "./screenGraphs";
import { ScreenEditProgram } from "./screenEditProgram";
import { Settings } from "../models/settings";

interface IProps {
  client: Window["fetch"];
  audio: AudioInterface;
  initialState: IState;
}

export function AppView(props: IProps): JSX.Element | null {
  const { client, audio } = props;
  const service = new Service(client);
  const [state, dispatch] = useThunkReducer(reducerWrapper, props.initialState, { service, audio }, [
    (action, oldState, newState) => {
      if (oldState.storage !== newState.storage) {
        dispatch(Thunk.sync());
      }
    },
    (action, oldState, newState) => {
      const progress = newState.progress[0];
      if (progress != null) {
        const oldProgram = Program.getProgram(oldState, progress.programId);
        const newProgram = Program.getProgram(newState, progress.programId);
        if (oldProgram !== newProgram) {
          dispatch({ type: "ApplyProgramChangesToProgress" });
        }
      }
    },
  ]);
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);

  useEffect(() => {
    window._webpushrScriptReady = () => {
      window.webpushr("fetch_id", (sid) => {
        dispatch({ type: "StoreWebpushrSidAction", sid });
      });
    };
    dispatch(Thunk.fetchStorage());
    dispatch(Thunk.fetchPrograms());
    if (state.storage.currentProgramId == null) {
      setShouldShowOnboarding(true);
    }
  }, []);

  const program =
    state.storage.currentProgramId != null ? Program.getProgram(state, state.storage.currentProgramId) : undefined;

  if (
    Screen.current(state.screenStack) === "programs" ||
    (Screen.current(state.screenStack) === "main" && program == null)
  ) {
    return (
      <Fragment>
        <ChooseProgramView
          screenStack={state.screenStack}
          dispatch={dispatch}
          programs={state.programs || []}
          customPrograms={state.storage.programs || []}
          editProgramId={state.progress[0]?.programId}
        />
        {shouldShowOnboarding && <ModalOnboarding onClose={() => setShouldShowOnboarding(false)} />}
      </Fragment>
    );
  } else if (Screen.current(state.screenStack) === "main") {
    if (program != null) {
      return (
        <ProgramHistoryView
          program={program}
          progress={state.progress?.[0]}
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
    return (
      <ProgramDayView
        progress={progress}
        history={state.storage.history}
        dispatch={dispatch}
        webpushr={state.webpushr}
        timerSince={progress.timerSince}
        timerMode={progress.timerMode}
        settings={state.storage.settings}
      />
    );
  } else if (Screen.current(state.screenStack) === "settings") {
    return (
      <ScreenSettings
        dispatch={dispatch}
        email={state.email}
        currentProgramName={Program.getProgram(state, state.storage.currentProgramId)?.name || ""}
        settings={state.storage.settings}
      />
    );
  } else if (Screen.current(state.screenStack) === "account") {
    return <ScreenAccount dispatch={dispatch} email={state.email} />;
  } else if (Screen.current(state.screenStack) === "timers") {
    return <ScreenTimers dispatch={dispatch} timers={state.storage.settings.timers} />;
  } else if (Screen.current(state.screenStack) === "plates") {
    return (
      <ScreenPlates
        dispatch={dispatch}
        bars={Settings.bars(state.storage.settings)}
        plates={Settings.plates(state.storage.settings)}
        units={state.storage.settings.units}
      />
    );
  } else if (Screen.current(state.screenStack) === "graphs") {
    return <ScreenGraphs settings={state.storage.settings} dispatch={dispatch} history={state.storage.history} />;
  } else if (Screen.editProgramScreens.indexOf(Screen.current(state.screenStack)) !== -1) {
    let editProgram = Program.getEditingProgram(state);
    editProgram = editProgram || Program.getProgram(state, state.progress[0]?.programId);
    if (editProgram != null) {
      return (
        <ScreenEditProgram
          settings={state.storage.settings}
          editExercise={state.editExercise}
          screen={Screen.current(state.screenStack)}
          dispatch={dispatch}
          programIndex={Program.getEditingProgramIndex(state)}
          dayIndex={Math.min(state.editProgram?.dayIndex ?? state.progress[0]?.day ?? 0, editProgram.days.length - 1)}
          editProgram={editProgram}
        />
      );
    } else {
      throw new Error("Opened 'editProgram' screen, but 'state.editProgram' is null");
    }
  } else {
    return null;
  }
}
