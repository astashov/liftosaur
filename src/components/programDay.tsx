import { h, JSX } from "preact";
import { CardsView } from "./cards";
import { HeaderView } from "./header";
import { FooterView } from "./footer";
import { ICurrent } from "../ducks/reducer";
import { Program, IProgram } from "../models/program";
import { IDispatch } from "../ducks/types";

interface IProps {
  current: ICurrent;
  programs: IProgram[];
  dispatch: IDispatch;
}

export function ProgramDayView(props: IProps): JSX.Element | null {
  const progress = props.current.progress;

  if (progress != null) {
    const currentProgram = Program.current(props.programs, props.current.programName)!;
    return (
      <section className="flex flex-col h-full">
        <HeaderView />
        <CardsView progress={progress} programDay={currentProgram.days[progress.day]} dispatch={props.dispatch} />
        <FooterView />
      </section>
    );
  } else {
    return null;
  }
}
