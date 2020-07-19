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
import { ScreenProgramSettings } from "./screenProgramSettings";
import { ModalOnboarding } from "./modalOnboarding";
import { ScreenGraphs } from "./screenGraphs";
import { ScreenEditProgram } from "./screenEditProgram";

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
  ]);
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);

  useEffect(() => {
    window._webpushrScriptReady = () => {
      window.webpushr("fetch_id", (sid) => {
        dispatch({ type: "StoreWebpushrSidAction", sid });
      });
    };
    dispatch(Thunk.googleOauthInitialize());
    dispatch(Thunk.fetchStorage());
    dispatch(Thunk.fetchPrograms());
    if (state.storage.currentProgramId == null) {
      setShouldShowOnboarding(true);
    }
  }, []);

  if (Screen.current(state.screenStack) === "programs") {
    return (
      <Fragment>
        <ChooseProgramView
          dispatch={dispatch}
          programs={state.programs || []}
          customPrograms={state.storage.programs || []}
        />
        {shouldShowOnboarding && <ModalOnboarding onClose={() => setShouldShowOnboarding(false)} />}
      </Fragment>
    );
  } else if (Screen.current(state.screenStack) === "main") {
    const program =
      state.storage.currentProgram2Id != null
        ? state.storage.programs.find((p) => p.id === state.storage.currentProgram2Id)
        : Program.get(state.storage.currentProgramId!);
    if (program != null) {
      return (
        <ProgramHistoryView
          program={program}
          programs={state.storage.programs}
          progress={state.progress?.[0]}
          settings={state.storage.settings}
          programStates={state.storage.programStates}
          history={state.storage.history}
          stats={state.storage.stats}
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
        programs={state.storage.programs}
        progress={progress}
        history={state.storage.history}
        stats={state.storage.stats}
        dispatch={dispatch}
        webpushr={state.webpushr}
        timerSince={progress.timerSince}
        timerMode={progress.timerMode}
        settings={state.storage.settings}
      />
    );
  } else if (Screen.current(state.screenStack) === "settings") {
    return <ScreenSettings dispatch={dispatch} email={state.email} currentProgram={state.storage.currentProgramId!} />;
  } else if (Screen.current(state.screenStack) === "account") {
    return <ScreenAccount dispatch={dispatch} email={state.email} />;
  } else if (Screen.current(state.screenStack) === "timers") {
    return <ScreenTimers dispatch={dispatch} timers={state.storage.settings.timers} />;
  } else if (Screen.current(state.screenStack) === "plates") {
    return (
      <ScreenPlates dispatch={dispatch} bars={state.storage.settings.bars} plates={state.storage.settings.plates} />
    );
  } else if (Screen.current(state.screenStack) === "graphs") {
    return <ScreenGraphs dispatch={dispatch} history={state.storage.history} stats={state.storage.stats} />;
  } else if (Screen.current(state.screenStack) === "programSettings") {
    return (
      <ScreenProgramSettings
        dispatch={dispatch}
        programId={state.storage.currentProgramId!}
        programStates={state.storage.programStates}
      />
    );
  } else if (Screen.editProgramScreens.indexOf(Screen.current(state.screenStack)) !== -1) {
    const editProgram = Program.getEditingProgram(state);
    if (editProgram != null) {
      return (
        <ScreenEditProgram
          screen={Screen.current(state.screenStack)}
          dispatch={dispatch}
          programIndex={Program.getEditingProgramIndex(state)}
          dayIndex={Program.getEditingProgramIndex(state)}
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
