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
  progress?: IHistoryRecord;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  programStates: Record<string, any>;
  stats: IStats;
  history: IHistoryRecord[];
  dispatch: IDispatch;
}

export function ProgramHistoryView(props: IProps): JSX.Element {
  const dispatch = props.dispatch;
  const sortedHistory = props.history.sort((a, b) => {
    return new Date(Date.parse(b.date)).getTime() - new Date(Date.parse(a.date)).getTime();
  });
  const lastHistoryRecord = sortedHistory.find((i) => i.programId === props.program.id);
  const programState = props.programStates[props.program.id];
  const nextHistoryRecord =
    props.progress || Program.nextProgramRecord(props.program, lastHistoryRecord?.day, programState);

  const history = [nextHistoryRecord, ...sortedHistory];

  return (
    <section className="h-full">
      <HeaderView title={props.program.name} subtitle="Current program" />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <div className="py-3 text-center border-b border-gray-200">
          <Button kind="green" onClick={() => props.dispatch({ type: "StartProgramDayAction" })}>
            {props.progress ? "Continue Workout" : "Start Next Workout"}
          </Button>
        </div>
        {history.map((historyRecord) => (
          <HistoryRecordView historyRecord={historyRecord} programStates={props.programStates} dispatch={dispatch} />
        ))}
      </section>
      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
