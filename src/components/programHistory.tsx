import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { IProgram, IHistoryRecord, ISettings, ISubscription } from "../types";
import { INavCommon, IState, updateState } from "../models/state";
import { Surface } from "./surface";
import { Footer2View } from "./footer2";
import { DateUtils } from "../utils/date";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { HistoryRecordsList } from "./historyRecordsList";
import { History } from "../models/history";
import { Screen } from "../models/screen";
import { WeekInsights } from "./weekInsights";
import { ModalPlannerSettings } from "../pages/planner/components/modalPlannerSettings";
import { lb } from "lens-shmens";
import { WeekCalendar } from "./weekCalendar";
import { BottomSheetMonthCalendar } from "./bottomSheetMonthCalendar";
import { HistoryRecordsNullState } from "./historyRecordsNullState";
import { CollectionUtils } from "../utils/collection";
import { ObjectUtils } from "../utils/object";
import { Progress } from "../models/progress";
import { useGradualList } from "../utils/useGradualList";
import { Program } from "../models/program";

interface IProps {
  program: IProgram;
  progress?: IHistoryRecord;
  history: IHistoryRecord[];
  settings: ISettings;
  subscription: ISubscription;
  navCommon: INavCommon;
  dispatch: IDispatch;
}

interface IWeekData {
  firstDayOfWeeks: number[];
  firstDayOfWeekToHistoryRecord: Partial<Record<number, IHistoryRecord>>;
  historyRecordDateToFirstDayOfWeek: Partial<Record<number, number>>;
}

function getWeeksData(history: IHistoryRecord[], startWeekFromMonday?: boolean): IWeekData {
  const firstDayOfWeeksSet: Set<number> = new Set();
  const historyRecordDateToFirstDayOfWeek: Partial<Record<number, number>> = {};
  const firstDayOfWeekToHistoryRecord: Partial<Record<number, IHistoryRecord>> = {};
  for (const record of history) {
    if (!Progress.isCurrent(record)) {
      const firstDayOfWeek = DateUtils.firstDayOfWeekTimestamp(record.id, startWeekFromMonday);
      if (firstDayOfWeekToHistoryRecord[firstDayOfWeek] == null) {
        firstDayOfWeekToHistoryRecord[firstDayOfWeek] = record;
      }
      firstDayOfWeeksSet.add(firstDayOfWeek);
      historyRecordDateToFirstDayOfWeek[record.id] = firstDayOfWeek;
    }
  }
  if (firstDayOfWeeksSet.size === 0) {
    const today = new Date();
    const firstDayOfWeek = DateUtils.firstDayOfWeekTimestamp(today.getTime(), startWeekFromMonday);
    firstDayOfWeeksSet.add(firstDayOfWeek);
  }
  const firstDayOfWeeks = CollectionUtils.sort(Array.from(firstDayOfWeeksSet));
  return {
    firstDayOfWeeks,
    historyRecordDateToFirstDayOfWeek,
    firstDayOfWeekToHistoryRecord,
  };
}

export function getWeekHistory(
  history: IHistoryRecord[],
  firstDayOfWeek: number,
  startWeekFromMonday?: boolean
): IHistoryRecord[] {
  return History.getHistoryRecordsForTimerange(history, firstDayOfWeek, "week", startWeekFromMonday);
}

export function ProgramHistoryView(props: IProps): JSX.Element {
  const dispatch = props.dispatch;
  const sortedHistory = useMemo(() => {
    const history = CollectionUtils.sort(props.history, (a, b) => {
      return new Date(Date.parse(b.date)).getTime() - new Date(Date.parse(a.date)).getTime();
    });
    if (props.progress) {
      history.unshift(props.progress);
    } else if (props.program && history.length > 0) {
      const nextHistoryRecord = Program.nextHistoryRecord(props.program, props.settings);
      history.unshift(nextHistoryRecord);
    }
    return history;
  }, [props.history, props.progress, props.program, props.settings]);
  const surfaceRef = useRef<HTMLElement>(null);
  const screenData = Screen.current(props.navCommon.screenStack);
  const initialHistoryRecordId = screenData.name === "main" ? screenData.params?.historyRecordId : undefined;
  let initialShift =
    initialHistoryRecordId != null ? sortedHistory.findIndex((record) => record.id === initialHistoryRecordId) : -1;
  initialShift = Math.max(0, initialShift);
  const { visibleRecords, loadMoreVisibleRecords } = useGradualList(
    sortedHistory,
    initialShift,
    20,
    surfaceRef,
    () => {}
  );
  const visibleHistory = useMemo(() => {
    return sortedHistory.slice(0, visibleRecords);
  }, [sortedHistory, visibleRecords]);
  const { firstDayOfWeeks, historyRecordDateToFirstDayOfWeek, firstDayOfWeekToHistoryRecord } = getWeeksData(
    sortedHistory,
    props.settings.startWeekFromMonday
  );
  const [selectedFirstDayOfWeek, setSelectedWeekFirstDay] = useState(firstDayOfWeeks[firstDayOfWeeks.length - 1]);
  const selectedFirstDayOfWeekRef = useRef(selectedFirstDayOfWeek);
  const previousWeekFirstDayDate = new Date(selectedFirstDayOfWeek);
  previousWeekFirstDayDate.setDate(previousWeekFirstDayDate.getDate() - 7);
  const previousWeekFirstDay = previousWeekFirstDayDate.getTime();
  const [showMonthCalendar, setShowMonthCalendar] = useState(false);
  const [showPlannerSettings, setShowPlannerSettings] = useState(false);
  const historyRecordsListRef = useRef<HTMLDivElement>(null);
  const [selectedWeekCalendarFirstDayOfWeek, setSelectedWeekCalendarFirstDayOfWeek] = useState(selectedFirstDayOfWeek);

  const prs = History.getPersonalRecords(props.history);
  const thisWeekHistory = getWeekHistory(sortedHistory, selectedFirstDayOfWeek, props.settings.startWeekFromMonday);
  const lastWeekHistory = getWeekHistory(sortedHistory, previousWeekFirstDay, props.settings.startWeekFromMonday);
  const loadingItems = props.navCommon.loading.items;
  const loadingKeys = Object.keys(loadingItems).filter((k) => loadingItems[k]?.endTime == null);
  const isLoading = Object.keys(loadingKeys).length > 0;

  useEffect(() => {
    selectedFirstDayOfWeekRef.current = selectedFirstDayOfWeek;
  }, [selectedFirstDayOfWeek]);

  useEffect(() => {
    let initialOffset: number | undefined;
    const scrollPosToFirstDayOfWeek = Array.from(historyRecordsListRef.current.childNodes).reduce<
      Partial<Record<number, number>>
    >((memo, node) => {
      const element = node as HTMLElement;
      const recordId = Number(element.id.replace("history-record-", ""));
      const firstDayOfWeek = historyRecordDateToFirstDayOfWeek[recordId];
      if (initialOffset == null) {
        initialOffset = element.offsetTop;
      }
      memo[element.offsetTop - initialOffset] = firstDayOfWeek;
      return memo;
    }, {});
    function scrollHandler(e: Event) {
      for (const scrollPos of ObjectUtils.keys(scrollPosToFirstDayOfWeek)) {
        if (scrollPos >= window.scrollY) {
          const firstDayOfWeek = scrollPosToFirstDayOfWeek[scrollPos];
          if (firstDayOfWeek != null && firstDayOfWeek !== selectedFirstDayOfWeekRef.current) {
            const weekElement = document.querySelector(`#week-calendar-${firstDayOfWeek}`);
            if (weekElement) {
              weekElement.scrollIntoView({
                behavior: "instant",
                block: "nearest",
                inline: "center",
              });
            }
            setSelectedWeekFirstDay(firstDayOfWeek);
          }
          break;
        }
      }
    }
    window.addEventListener("scroll", scrollHandler);
    return () => {
      window.removeEventListener("scroll", scrollHandler);
    };
  }, [visibleRecords]);

  const scrollToElement = useCallback((id: number) => {
    const element = document.getElementById(`history-record-${id}`);
    if (element != null) {
      element.scrollIntoView({
        behavior: "instant",
        block: "nearest",
        inline: "center",
      });
    }
  }, []);

  useEffect(() => {
    if (initialHistoryRecordId != null) {
      scrollToElement(initialHistoryRecordId);
    }
  }, [initialHistoryRecordId]);

  return (
    <Surface
      ref={surfaceRef}
      navbar={
        <div className="fixed top-0 left-0 z-30 w-full border-b border-grayv3-100">
          <WeekCalendar
            startWeekFromMonday={props.settings.startWeekFromMonday}
            selectedWeekCalendarFirstDayOfWeek={selectedWeekCalendarFirstDayOfWeek}
            history={sortedHistory}
            firstDayOfWeekToHistoryRecord={firstDayOfWeekToHistoryRecord}
            firstDayOfWeeks={firstDayOfWeeks}
            isLoading={isLoading}
            selectedFirstDayOfWeek={selectedFirstDayOfWeek}
            onClick={() => setShowMonthCalendar(true)}
            onSelectFirstDayOfWeek={(firstDayOfWeek) => {
              setSelectedWeekCalendarFirstDayOfWeek(firstDayOfWeek);
            }}
          />
        </div>
      }
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
      addons={
        <>
          <BottomSheetMonthCalendar
            prs={prs}
            firstDayOfWeeks={firstDayOfWeeks}
            history={sortedHistory}
            startWeekFromMonday={props.settings.startWeekFromMonday}
            selectedFirstDayOfWeek={selectedWeekCalendarFirstDayOfWeek}
            visibleRecords={visibleRecords}
            isHidden={!showMonthCalendar}
            onClose={() => setShowMonthCalendar(false)}
            onClick={(historyRecord) => {
              const index = sortedHistory.findIndex((record) => record.id === historyRecord.id);
              const scrollToElementCal = () => {
                scrollToElement(historyRecord.id);
                setShowMonthCalendar(false);
              };
              if (visibleHistory.length < index) {
                loadMoreVisibleRecords(index - visibleHistory.length + 20);
                setTimeout(scrollToElementCal, 100);
              } else {
                scrollToElementCal();
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
      <WeekInsights
        dispatch={props.dispatch}
        prs={prs}
        selectedFirstDayOfWeek={selectedFirstDayOfWeek}
        thisWeekHistory={thisWeekHistory}
        lastWeekHistory={lastWeekHistory}
        settings={props.settings}
        onOpenPlannerSettings={() => setShowPlannerSettings(true)}
        subscription={props.subscription}
      />
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-0 pt-20 overflow-y-auto" ref={historyRecordsListRef}>
          {visibleHistory.length > 0 ? (
            <HistoryRecordsList
              history={visibleHistory}
              firstDayOfWeeks={firstDayOfWeeks}
              prs={prs}
              isOngoing={!!(props.progress && Progress.isCurrent(props.progress))}
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
