import { Fragment, h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { IPersonalRecords } from "../models/history";
import { IHistoryRecord, IProgram, ISettings, ISubscription } from "../types";
import { HistoryRecordView } from "./historyRecord";
import { Program } from "../models/program";

interface IHistoryRecordsListProps {
  history: IHistoryRecord[];
  program: IProgram;
  isOngoing: boolean;
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
            isOngoing={props.isOngoing}
            showTitle={true}
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
