import { h, JSX } from "preact";
import { useReducer, useEffect } from "preact/hooks";
import { HeaderView } from "./header";
import { CardsView } from "./cards";
import { FooterView } from "./footer";
import { getInitialState, reducerWrapper } from "../ducks/reducer";
import { Program } from "../models/program";

export function AppView(): JSX.Element | null {
  const [state, dispatch] = useReducer(reducerWrapper, getInitialState());
  useEffect(() => {
    dispatch({ type: "StartProgramDayAction" });
  }, []);
  const current = state.current!;
  const progress = state.current!.progress;

  if (progress != null) {
    const currentProgram = Program.current(state.programs, current.programName)!;
    return (
      <section className="flex flex-col h-full">
        <HeaderView />
        <CardsView progress={progress} programDay={currentProgram.days[progress.day]} dispatch={dispatch} />
        <FooterView />
      </section>
    );
  } else {
    return null;
  }
}
