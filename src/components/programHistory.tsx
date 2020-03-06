import { h, JSX } from "preact";
import { IProgram } from "../models/program";
import { IDispatch } from "../ducks/types";
import { HeaderView } from "./header";
import { FooterView } from "./footer";
import { IHistoryRecord } from "../models/history";
import { HistoryRecordView } from "./historyRecord";

interface IProps {
  program: IProgram;
  history: IHistoryRecord[];
  dispatch: IDispatch;
}

export function ProgramHistoryView(props: IProps): JSX.Element {
  const lastHistoryRecord = props.history.find(i => i.programName === props.program.name);
  const day = lastHistoryRecord?.day ?? 0;
  const nextProgramDay = props.program.days[day];

  return (
    <section className="flex flex-col h-full">
      <HeaderView />
      <HistoryRecordView programDay={nextProgramDay} lastHistoryRecord={lastHistoryRecord} dispatch={props.dispatch} />
      <div className="text-center py-3">
        <button
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 border border-green-700 rounded"
          onClick={() => props.dispatch({ type: "StartProgramDayAction" })}
        >
          Start Next Workout
        </button>
      </div>
      <FooterView />
    </section>
  );
}
