import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { IProgram } from "../models/program";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { ProgramListView } from "./programList";

interface IProps {
  programs: IProgram[];
  dispatch: IDispatch;
}

export function ChooseProgramView(props: IProps): JSX.Element {
  return (
    <section className="flex flex-col h-full">
      <HeaderView />
      <ProgramListView programs={props.programs} dispatch={props.dispatch} />
      <FooterView />
    </section>
  );
}
