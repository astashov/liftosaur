import { Fragment, h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { Progress } from "../models/progress";
import { IHistoryRecord, ISettings } from "../types";
import { HistoryRecordView } from "./historyRecord";

interface IHistoryRecordsListProps {
  history: IHistoryRecord[];
  progress?: IHistoryRecord;
  settings: ISettings;
  currentUserId?: string;
  dispatch: IDispatch;
  visibleRecords: number;
}

export function HistoryRecordsList(props: IHistoryRecordsListProps): JSX.Element {
  const { history, settings, dispatch, visibleRecords } = props;
  const combinedHistory = history.slice(0, visibleRecords);
  combinedHistory.sort((a, b) => {
    if (Progress.isCurrent(a)) {
      return -1;
    } else if (Progress.isCurrent(b)) {
      return 1;
    } else {
      return new Date(Date.parse(b.date)).getTime() - new Date(Date.parse(a.date)).getTime();
    }
  });
  return (
    <Fragment>
      {combinedHistory.map((historyRecord) => (
        <HistoryRecordView
          isOngoing={!!(Progress.isCurrent(historyRecord) && props.progress)}
          settings={settings}
          historyRecord={historyRecord}
          userId={props.currentUserId}
          dispatch={dispatch}
        />
      ))}
    </Fragment>
  );
}
