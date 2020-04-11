import { h, JSX } from "preact";
import { useReducer, useEffect } from "preact/hooks";
import { getInitialState, reducerWrapper } from "../ducks/reducer";
import { ProgramDayView } from "./programDay";
import { ChooseProgramView } from "./chooseProgram";
import { ProgramHistoryView } from "./programHistory";
import { Program } from "../models/program";

export function AppView(): JSX.Element | null {
  const [state, dispatch] = useReducer(reducerWrapper, getInitialState());
  useEffect(() => {
    window._webpushrScriptReady = () => {
      window.webpushr("fetch_id", sid => {
        dispatch({ type: "StoreWebpushrSidAction", sid });
      });
    };
  }, []);
  const programId = state.storage.currentProgramId;
  if (programId == null) {
    return <ChooseProgramView dispatch={dispatch} />;
  } else if (state.progress == null) {
    const program = Program.get(programId);
    return (
      <ProgramHistoryView
        program={program}
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
}
