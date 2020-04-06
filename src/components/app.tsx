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
  const current = state.current;
  if (current == null) {
    return <ChooseProgramView dispatch={dispatch} />;
  } else if (current.progress == null) {
    const program = Program.get(current.programId);
    return <ProgramHistoryView program={program} history={state.history} stats={state.stats} dispatch={dispatch} />;
  } else {
    return (
      <ProgramDayView
        current={current}
        history={state.history}
        stats={state.stats}
        dispatch={dispatch}
        webpushr={state.webpushr}
        settings={state.settings}
      />
    );
  }
}
