import { h, JSX } from "preact";
import { IProgram } from "../models/program";
import { IDispatch } from "../ducks/types";
import { HeaderView } from "./header";
import { FooterView } from "./footer";
import { IHistoryRecord } from "../models/history";
import { Program } from "../models/program";
import { Button } from "./button";
import { HistoryRecordView } from "./historyRecord";
import { IStats } from "../models/stats";

interface IProps {
  program: IProgram;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  programStates: Record<string, any>;
  stats: IStats;
  history: IHistoryRecord[];
  dispatch: IDispatch;
}

export function ProgramHistoryView(props: IProps): JSX.Element {
  const dispatch = props.dispatch;
  const lastHistoryRecord = props.history.find(i => i.programId === props.program.id);
  const nextHistoryRecord = Program.nextProgramRecord(
    props.program,
    lastHistoryRecord?.day,
    props.programStates[props.program.id]
  );

  const history = [...props.history, nextHistoryRecord].sort((a, b) => {
    if (a.date == null) {
      return 1;
    } else if (b.date == null) {
      return -1;
    } else {
      return new Date(Date.parse(a.date)).getTime() - new Date(Date.parse(b.date)).getTime();
    }
  });

  return (
    <section className="flex flex-col h-full">
      <HeaderView title={props.program.name} subtitle="Current program" />
      <section className="flex-1 h-0 overflow-y-auto">
        {history.map(historyRecord => (
          <HistoryRecordView historyRecord={historyRecord} dispatch={dispatch} />
        ))}
        <div className="py-3 text-center">
          <Button kind="green" onClick={() => props.dispatch({ type: "StartProgramDayAction" })}>
            Start Next Workout
          </Button>
        </div>
      </section>
      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
