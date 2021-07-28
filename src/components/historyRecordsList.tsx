import { Fragment, h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { IFriendUser } from "../models/state";
import { IHistoryRecord, ISettings } from "../types";
import { HistoryRecordView } from "./historyRecord";

interface IHistoryRecordsListProps {
  history: IHistoryRecord[];
  settings: ISettings;
  friendsHistory: Partial<Record<string, IFriendUser>>;
  dispatch: IDispatch;
  visibleRecords: number;
}

interface IAttributedHistoryRecord {
  user: "self" | IFriendUser;
  record: IHistoryRecord;
}

export function HistoryRecordsList(props: IHistoryRecordsListProps): JSX.Element {
  const { history, settings, friendsHistory, dispatch, visibleRecords } = props;
  const combinedHistory = [
    ...history.slice(0, visibleRecords),
    ...(settings.shouldShowFriendsHistory ? Object.values(friendsHistory) : []),
  ].reduce<IAttributedHistoryRecord[]>((memo, item) => {
    if ("storage" in item!) {
      for (const hr of item.storage.history) {
        memo.push({ user: item, record: hr });
      }
    } else {
      memo.push({ user: "self", record: item! });
    }
    return memo;
  }, []);
  combinedHistory.sort((a, b) => {
    return new Date(Date.parse(b.record.date)).getTime() - new Date(Date.parse(a.record.date)).getTime();
  });
  return (
    <Fragment>
      {combinedHistory.map((historyRecord) =>
        historyRecord.user === "self" ? (
          <HistoryRecordView settings={settings} historyRecord={historyRecord.record} dispatch={dispatch} />
        ) : (
          <HistoryRecordView
            settings={historyRecord.user.storage.settings}
            nickname={historyRecord.user.nickname || historyRecord.user.id}
            userId={historyRecord.user.id}
            historyRecord={historyRecord.record}
            dispatch={dispatch}
          />
        )
      )}
    </Fragment>
  );
}
