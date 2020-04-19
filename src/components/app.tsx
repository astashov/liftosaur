import { h, JSX } from "preact";
import { useEffect } from "preact/hooks";
import { getInitialState, reducerWrapper } from "../ducks/reducer";
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

export function AppView(): JSX.Element | null {
  const client = window.fetch.bind(window);
  const service = new Service(client);
  const [state, dispatch] = useThunkReducer(reducerWrapper, getInitialState(), { service }, [
    (action, oldState, newState) => {
      if (oldState.storage !== newState.storage) {
        dispatch(Thunk.sync());
      }
    }
  ]);

  useEffect(() => {
    window._webpushrScriptReady = () => {
      window.webpushr("fetch_id", sid => {
        dispatch({ type: "StoreWebpushrSidAction", sid });
      });
    };
    dispatch(Thunk.googleOauthInitialize());
    dispatch(Thunk.fetchStorage());
  }, []);

  if (Screen.current(state.screenStack) === "main") {
    const programId = state.storage.currentProgramId;
    if (programId == null) {
      return <ChooseProgramView dispatch={dispatch} />;
    } else if (state.progress == null) {
      const program = Program.get(programId);
      return (
        <ProgramHistoryView
          program={program}
          programStates={state.storage.programStates}
          history={state.storage.history}
          stats={state.storage.stats}
          dispatch={dispatch}
        />
      );
    } else {
      return (
        <ProgramDayView
          programId={programId}
          progress={state.progress}
          history={state.storage.history}
          stats={state.storage.stats}
          dispatch={dispatch}
          webpushr={state.webpushr}
          settings={state.storage.settings}
        />
      );
    }
  } else if (Screen.current(state.screenStack) === "settings") {
    return <ScreenSettings dispatch={dispatch} email={state.email} />;
  } else if (Screen.current(state.screenStack) === "account") {
    return <ScreenAccount dispatch={dispatch} email={state.email} />;
  } else {
    return null;
  }
}
