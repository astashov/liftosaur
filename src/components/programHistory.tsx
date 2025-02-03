import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { IProgram, IHistoryRecord, ISettings, ISubscription } from "../types";
import { INavCommon, IState, updateState } from "../models/state";
import { Surface } from "./surface";
import { Footer2View } from "./footer2";
import { DateUtils } from "../utils/date";
import { useState } from "preact/hooks";
import { HistoryRecordsList } from "./historyRecordsList";
import { History } from "../models/history";
import { Screen } from "../models/screen";
import { StringUtils } from "../utils/string";
import { WeekInsights } from "./weekInsights";
import { ModalPlannerSettings } from "../pages/planner/components/modalPlannerSettings";
import { lb } from "lens-shmens";
import { WeekCalendar } from "./weekCalendar";
import { BottomSheetMonthCalendar } from "./bottomSheetMonthCalendar";
import { Thunk } from "../ducks/thunks";
import { HistoryRecordsNullState } from "./historyRecordsNullState";

interface IProps {
  program: IProgram;
  history: IHistoryRecord[];
  settings: ISettings;
  subscription: ISubscription;
  navCommon: INavCommon;
  dispatch: IDispatch;
}

function getWeeks(history: IHistoryRecord[]): Date[] {
  const lastWorkout = history[history.length - 1];
  const firstWeek = new Date(
    DateUtils.firstDayOfWeekTimestamp(lastWorkout ? new Date(Date.parse(lastWorkout.date)) : new Date())
  );
  const firstWorkout = history[0];
  let lastWeek = new Date(
    DateUtils.firstDayOfWeekTimestamp(firstWorkout ? new Date(Date.parse(firstWorkout.date)) : new Date())
  );
  const currentWeek = DateUtils.firstDayOfWeekTimestamp(new Date());
  lastWeek = lastWeek.getTime() < currentWeek ? new Date(currentWeek) : lastWeek;
  const weeks: Date[] = [];
  while (firstWeek <= lastWeek) {
    weeks.push(new Date(firstWeek));
    firstWeek.setDate(firstWeek.getDate() + 7);
  }
  return weeks;
}

export function getWeekHistory(history: IHistoryRecord[], weeks: Date[], weekIndex: number): IHistoryRecord[] {
  const week = weeks[weekIndex];
  if (week == null) {
    return [];
  }
  return History.getHistoryRecordsForTimerange(history, week, "week");
}

export function ProgramHistoryView(props: IProps): JSX.Element {
  const dispatch = props.dispatch;
  const sortedHistory = props.history.sort((a, b) => {
    return new Date(Date.parse(b.date)).getTime() - new Date(Date.parse(a.date)).getTime();
  });
  const weeks = getWeeks(sortedHistory);
  const screenData = Screen.current(props.navCommon.screenStack);
  const initialWeek = screenData.name === "main" ? screenData.params?.week : undefined;
  const currentWeek = weeks.findIndex((week) => week.getTime() === DateUtils.firstDayOfWeekTimestamp(new Date()));
  const selectedWeek = initialWeek ?? (currentWeek !== -1 ? currentWeek : weeks.length - 1);
  const [forceToggle, setForceToggle] = useState(false);
  const [showMonthCalendar, setShowMonthCalendar] = useState(false);
  const [showPlannerSettings, setShowPlannerSettings] = useState(false);

  const prs = History.getPersonalRecords(props.history);
  const thisWeekHistory = getWeekHistory(sortedHistory, weeks, selectedWeek);
  const lastWeekHistory = getWeekHistory(sortedHistory, weeks, selectedWeek - 1);
  const startTs = weeks[selectedWeek].getTime();
  const endRange = new Date(startTs);
  endRange.setDate(endRange.getDate() + 6);
  const formattedRange = DateUtils.formatRange(startTs, endRange);
  const loadingItems = props.navCommon.loading.items;
  const loadingKeys = Object.keys(loadingItems).filter((k) => loadingItems[k]?.endTime == null);
  const isLoading = Object.keys(loadingKeys).length > 0;

  return (
    <Surface
      navbar={
        <div className="fixed top-0 left-0 z-30 w-full border-b border-grayv3-300">
          <WeekCalendar
            history={sortedHistory}
            weeks={weeks}
            isLoading={isLoading}
            forceToggle={forceToggle}
            selectedWeek={selectedWeek}
            onClick={() => setShowMonthCalendar(true)}
            onSelectWeek={(week) => {
              props.dispatch(
                Thunk.updateScreenParams<"main">({ week })
              );
            }}
          />
        </div>
      }
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
      addons={
        <>
          <BottomSheetMonthCalendar
            prs={prs}
            weeks={weeks}
            history={sortedHistory}
            selectedWeek={selectedWeek}
            isHidden={!showMonthCalendar}
            onClose={() => setShowMonthCalendar(false)}
            onClick={(day) => {
              const beginningOfWeek = DateUtils.firstDayOfWeekTimestamp(day);
              const newWeek = weeks.findIndex((week) => week.getTime() === beginningOfWeek);
              if (newWeek !== -1) {
                props.dispatch(
                  Thunk.updateScreenParams<"main">({ week: newWeek })
                );
                setShowMonthCalendar(false);
                setForceToggle(!forceToggle);
              }
            }}
          />
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
      }
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-0 pt-4 overflow-y-auto">
          <div className="px-4">
            <span className="text-lg font-semibold">{formattedRange}</span>
            <span> · </span>
            <span className="text-sm">
              {thisWeekHistory.length} {StringUtils.pluralize("workout", thisWeekHistory.length)}
            </span>
          </div>
          <WeekInsights
            dispatch={props.dispatch}
            prs={prs}
            thisWeekHistory={thisWeekHistory}
            lastWeekHistory={lastWeekHistory}
            settings={props.settings}
            onOpenPlannerSettings={() => setShowPlannerSettings(true)}
            subscription={props.subscription}
          />
          {sortedHistory.length > 0 ? (
            <HistoryRecordsList
              history={thisWeekHistory}
              prs={prs}
              program={props.program}
              subscription={props.subscription}
              settings={props.settings}
              dispatch={dispatch}
            />
          ) : (
            <HistoryRecordsNullState />
          )}
        </div>
      </div>
    </Surface>
  );
}
