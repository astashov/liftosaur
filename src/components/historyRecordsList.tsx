import { IDispatch } from "../ducks/types";
import { Progress } from "../models/progress";
import { IHistoryRecord, ISettings, ISubscription } from "../types";
import { HistoryRecordView } from "./historyRecord";
import { DateUtils } from "../utils/date";
import { WeekInsights, WeekInsightsTeaser } from "./weekInsights";
import { useState } from "react";
import { ModalPlannerSettings } from "../pages/planner/components/modalPlannerSettings";
import { IState, updateState } from "../models/state";
import { lb } from "lens-shmens";
import { Subscriptions } from "../utils/subscriptions";

interface IHistoryRecordsListProps {
  history: IHistoryRecord[];
  progress?: IHistoryRecord;
  settings: ISettings;
  currentUserId?: string;
  dispatch: IDispatch;
  visibleRecords: number;
  subscription: ISubscription;
}

interface IWeekInsightsRecordWrapper {
  type: "weekInsights";
  historyRecords: IHistoryRecord[];
}

interface IHistoryRecordWrapper {
  type: "historyRecord";
  historyRecord: IHistoryRecord;
}

function insertWeekInsights(history: IHistoryRecord[]): Array<IHistoryRecordWrapper | IWeekInsightsRecordWrapper> {
  const combinedHistoryAndInsights: Array<IHistoryRecordWrapper | IWeekInsightsRecordWrapper> = [];
  let weekRecords: IHistoryRecord[] = [];
  for (let i = 0; i < history.length; i++) {
    const historyRecord = history[i];
    if (!Progress.isCurrent(historyRecord)) {
      const todayFirstDayOfWeekTs = DateUtils.firstDayOfWeekTimestamp(Date.now());
      const currentWeekTs = DateUtils.firstDayOfWeekTimestamp(historyRecord.startTime);
      if (currentWeekTs !== todayFirstDayOfWeekTs) {
        const lastWeekRecord = weekRecords[weekRecords.length - 1];
        const weekTs = lastWeekRecord ? DateUtils.firstDayOfWeekTimestamp(lastWeekRecord.startTime) : undefined;
        if (weekTs != null && currentWeekTs !== weekTs) {
          combinedHistoryAndInsights.splice(combinedHistoryAndInsights.length - weekRecords.length, 0, {
            type: "weekInsights",
            historyRecords: [...weekRecords],
          });
          weekRecords = [];
        }
        weekRecords.push(historyRecord);
      }
    }
    combinedHistoryAndInsights.push({ type: "historyRecord", historyRecord });
  }
  return combinedHistoryAndInsights;
}

export function HistoryRecordsList(props: IHistoryRecordsListProps): JSX.Element {
  const { history, settings, dispatch, visibleRecords } = props;
  const [showPlannerSettings, setShowPlannerSettings] = useState(false);
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
  const combinedHistoryAndInsights = insertWeekInsights(combinedHistory);
  return (
    <>
      {combinedHistoryAndInsights.map((record) => {
        if (record.type === "weekInsights") {
          if (Subscriptions.hasSubscription(props.subscription)) {
            return (
              <WeekInsights
                key={`insights-${record.historyRecords[0]?.id}`}
                historyRecords={record.historyRecords}
                settings={settings}
                onOpenPlannerSettings={() => {
                  setShowPlannerSettings(true);
                }}
              />
            );
          } else {
            return <WeekInsightsTeaser key={`insights-${record.historyRecords[0]?.id}`} dispatch={props.dispatch} />;
          }
        } else {
          return (
            <HistoryRecordView
              key={`record-${record.historyRecord.id}`}
              isOngoing={!!(Progress.isCurrent(record.historyRecord) && props.progress)}
              settings={settings}
              historyRecord={record.historyRecord}
              userId={props.currentUserId}
              dispatch={dispatch}
            />
          );
        }
      })}
      {showPlannerSettings && (
        <ModalPlannerSettings
          inApp={true}
          onNewSettings={(newSettings) =>
            updateState(props.dispatch, [lb<IState>().p("storage").p("settings").record(newSettings)])
          }
          settings={props.settings}
          onClose={() => setShowPlannerSettings(false)}
        />
      )}
    </>
  );
}
