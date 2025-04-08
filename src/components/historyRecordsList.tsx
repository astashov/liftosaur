import { Fragment, h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { IPersonalRecords } from "../models/history";
import { IHistoryRecord, IProgram, ISettings, ISubscription } from "../types";
import { HistoryRecordView } from "./historyRecord";
import { Program } from "../models/program";
import { Progress } from "../models/progress";

interface IHistoryRecordsListProps {
  history: IHistoryRecord[];
  program: IProgram;
  prs: IPersonalRecords;
  settings: ISettings;
  firstDayOfWeeks: number[];
  dispatch: IDispatch;
  subscription: ISubscription;
}

export function HistoryRecordsList(props: IHistoryRecordsListProps): JSX.Element {
  const { history, settings, dispatch } = props;
  const program = Program.evaluate(props.program, props.settings);
  const programDay = Program.getProgramDay(program, program.nextDay);
  return (
    <Fragment>
      {history.map((record) => {
        return (
          <HistoryRecordView
            isOngoing={Progress.isCurrent(record)}
            programDay={programDay}
            prs={props.prs}
            settings={settings}
            historyRecord={record}
            dispatch={dispatch}
          />
        );
      })}
    </Fragment>
  );
}
