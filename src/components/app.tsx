import { h, JSX } from "preact";
import { useReducer } from "preact/hooks";
import { getInitialState, reducerWrapper } from "../ducks/reducer";
import { ProgramDayView } from "./programDay";
import { ChooseProgramView } from "./chooseProgram";
import { ProgramHistoryView } from "./programHistory";

export function AppView(): JSX.Element | null {
  const [state, dispatch] = useReducer(reducerWrapper, getInitialState());
  const current = state.current;
  if (current == null) {
    return <ChooseProgramView programs={state.programs} dispatch={dispatch} />;
  } else if (current.progress == null) {
    const program = state.programs.find(p => p.name === current.programName)!;
    return <ProgramHistoryView program={program} history={state.history} dispatch={dispatch} />;
  } else {
    return <ProgramDayView current={current} programs={state.programs} dispatch={dispatch} />;
  }
}
