import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { ProgramListView } from "./programList";

interface IProps {
  dispatch: IDispatch;
}

export function ChooseProgramView(props: IProps): JSX.Element {
  return (
    <section className="flex flex-col h-full">
      <HeaderView>Choose a program</HeaderView>
      <ProgramListView dispatch={props.dispatch} />
      <FooterView />
    </section>
  );
}
