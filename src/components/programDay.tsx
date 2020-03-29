import { h, JSX } from "preact";
import { CardsView } from "./cards";
import { HeaderView } from "./header";
import { FooterView } from "./footer";
import { ICurrent } from "../ducks/reducer";
import { Program } from "../models/program";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord } from "../models/history";
import { IStats } from "../models/stats";

interface IProps {
  current: ICurrent;
  history: IHistoryRecord[];
  stats: IStats;
  dispatch: IDispatch;
}

export function ProgramDayView(props: IProps): JSX.Element | null {
  const progress = props.current.progress;

  if (progress != null) {
    const currentProgram = Program.get(props.current.programId);
    const programDay = currentProgram.days[progress.day];
    const lastHistoryRecord = props.history.find(i => i.programId === currentProgram.id);
    const nextHistoryRecord = Program.nextProgramRecord(currentProgram, props.stats, lastHistoryRecord?.day);
    return (
      <section className="flex flex-col h-full">
        <HeaderView />
        <CardsView
          progress={progress}
          programDay={programDay}
          nextHistoryRecord={nextHistoryRecord}
          dispatch={props.dispatch}
        />
        <FooterView />
      </section>
    );
  } else {
    return null;
  }
}
