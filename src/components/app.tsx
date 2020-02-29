import { h, JSX } from "preact";
import { useReducer } from "preact/hooks";
import { HeaderView } from "./header";
import { CardsView } from "./cards";
import { FooterView } from "./footer";
import { reducer, getInitialState } from "../ducks/reducer";

export function AppView(): JSX.Element {
  const [state, dispatch] = useReducer(reducer, getInitialState());
  const current = state.current!;
  const progress = state.current!.progress!;

  return (
    <section className="flex flex-col h-full">
      <HeaderView />
      <CardsView
        progress={progress}
        programDay={current.program.days[progress.day]}
      />
      <FooterView />
    </section>
  );
}
