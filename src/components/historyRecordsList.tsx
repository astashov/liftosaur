import { Fragment, h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { IAllComments, IAllLikes, IFriendUser } from "../models/state";
import { IHistoryRecord, ISettings } from "../types";
import { HistoryRecordView } from "./historyRecord";

interface IHistoryRecordsListProps {
  history: IHistoryRecord[];
  settings: ISettings;
  friendsHistory: Partial<Record<string, IFriendUser>>;
  currentUserId?: string;
  comments: IAllComments;
  likes: IAllLikes;
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
          <HistoryRecordView
            settings={settings}
            historyRecord={historyRecord.record}
            userId={props.currentUserId}
            likes={props.likes}
            dispatch={dispatch}
            comments={props.comments}
          />
        ) : (
          <HistoryRecordView
            comments={props.comments}
            settings={historyRecord.user.storage.settings}
            nickname={historyRecord.user.nickname || historyRecord.user.id}
            friendId={historyRecord.user.id}
            likes={props.likes}
            historyRecord={historyRecord.record}
            dispatch={dispatch}
          />
        )
      )}
    </Fragment>
  );
}
