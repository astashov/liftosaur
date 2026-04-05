import { JSX, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IDispatch } from "../ducks/types";
import { IProgram, IHistoryRecord, ISettings, ISubscription } from "../types";
import { INavCommon, IState, updateState } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";
import { DateUtils_firstDayOfWeekTimestamp } from "../utils/date";
import { HistoryRecordsList } from "./historyRecordsList";
import { History_getHistoryRecordsForTimerange, History_getPersonalRecords } from "../models/history";
import { WeekInsights } from "./weekInsights";
import { lb } from "lens-shmens";
import { WeekCalendar } from "./weekCalendar";
import { HistoryRecordsNullState } from "./historyRecordsNullState";
import { CollectionUtils_sort } from "../utils/collection";
import { ObjectUtils_keys } from "../utils/object";
import { Progress_isCurrent } from "../models/progress";
import { useGradualList } from "../utils/useGradualList";
import { Program_nextHistoryRecord } from "../models/program";
import { navigationRef } from "../navigation/navigationRef";
import { useAppState } from "../navigation/StateContext";

interface IProps {
  program: IProgram;
  progress?: IHistoryRecord;
  history: IHistoryRecord[];
  settings: ISettings;
  subscription: ISubscription;
  navCommon: INavCommon;
  dispatch: IDispatch;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  initialHistoryRecordId?: number;
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
    if (!Progress_isCurrent(record)) {
      const firstDayOfWeek = DateUtils_firstDayOfWeekTimestamp(record.endTime ?? record.startTime, startWeekFromMonday);
      if (firstDayOfWeekToHistoryRecord[firstDayOfWeek] == null) {
        firstDayOfWeekToHistoryRecord[firstDayOfWeek] = record;
      }
      firstDayOfWeeksSet.add(firstDayOfWeek);
      historyRecordDateToFirstDayOfWeek[record.id] = firstDayOfWeek;
    }
  }
  if (firstDayOfWeeksSet.size === 0) {
    const today = new Date();
    const firstDayOfWeek = DateUtils_firstDayOfWeekTimestamp(today.getTime(), startWeekFromMonday);
    firstDayOfWeeksSet.add(firstDayOfWeek);
  }
  const firstDayOfWeeks = CollectionUtils_sort(Array.from(firstDayOfWeeksSet));
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
  return History_getHistoryRecordsForTimerange(history, firstDayOfWeek, "week", startWeekFromMonday);
}

export function ProgramHistoryView(props: IProps): JSX.Element {
  const dispatch = props.dispatch;
  const sortedHistory = useMemo(() => {
    const history = CollectionUtils_sort(props.history, (a, b) => {
      return new Date(Date.parse(b.date)).getTime() - new Date(Date.parse(a.date)).getTime();
    });
    if (props.progress) {
      history.unshift(props.progress);
    } else if (props.program && history.length > 0) {
      const nextHistoryRecord = Program_nextHistoryRecord(props.program, props.settings, props.navCommon.stats);
      history.unshift(nextHistoryRecord);
    }
    return history;
  }, [props.history, props.progress, props.program, props.settings]);
  const surfaceRef = useRef<HTMLElement>(null);
  const initialHistoryRecordId = props.initialHistoryRecordId;
  let initialShift =
    initialHistoryRecordId != null ? sortedHistory.findIndex((record) => record.id === initialHistoryRecordId) : -1;
  initialShift = Math.max(0, initialShift);
  const { visibleRecords, loadMoreVisibleRecords } = useGradualList(
    sortedHistory,
    initialShift,
    20,
    surfaceRef,
    () => {},
    props.scrollContainerRef
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
  const historyRecordsListRef = useRef<HTMLDivElement>(null);
  const [selectedWeekCalendarFirstDayOfWeek, setSelectedWeekCalendarFirstDayOfWeek] = useState(selectedFirstDayOfWeek);

  const prs = History_getPersonalRecords(props.history);
  const thisWeekHistory = getWeekHistory(sortedHistory, selectedFirstDayOfWeek, props.settings.startWeekFromMonday);
  const lastWeekHistory = getWeekHistory(sortedHistory, previousWeekFirstDay, props.settings.startWeekFromMonday);
  const loadingItems = props.navCommon.loading.items;
  const loadingKeys = Object.keys(loadingItems).filter((k) => loadingItems[k]?.endTime == null);
  const isLoading = Object.keys(loadingKeys).length > 0;

  useEffect(() => {
    selectedFirstDayOfWeekRef.current = selectedFirstDayOfWeek;
  }, [selectedFirstDayOfWeek]);

  useEffect(() => {
    const scrollEl = props.scrollContainerRef?.current;
    let initialOffset: number | undefined;
    const scrollPosToFirstDayOfWeek = Array.from(historyRecordsListRef.current!.childNodes).reduce<
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
    function scrollHandler(e: Event): void {
      const scrollTop = scrollEl ? scrollEl.scrollTop : window.scrollY;
      for (const scrollPos of ObjectUtils_keys(scrollPosToFirstDayOfWeek)) {
        if (scrollPos >= scrollTop) {
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
    const target = scrollEl || window;
    target.addEventListener("scroll", scrollHandler);
    return () => {
      target.removeEventListener("scroll", scrollHandler);
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

  const { state: appState } = useAppState();
  const scrollToRecordId = appState.scrollToHistoryRecordId;
  useEffect(() => {
    if (scrollToRecordId != null) {
      updateState(props.dispatch, [lb<IState>().p("scrollToHistoryRecordId").record(undefined)], "Clear scroll target");
      const index = sortedHistory.findIndex((record) => record.id === scrollToRecordId);
      if (visibleHistory.length < index) {
        loadMoreVisibleRecords(index - visibleHistory.length + 20);
        setTimeout(() => scrollToElement(scrollToRecordId), 100);
      } else {
        scrollToElement(scrollToRecordId);
      }
    }
  }, [scrollToRecordId]);

  useNavOptions({ navHidden: true });

  return (
    <section ref={surfaceRef}>
      <div className="fixed top-0 left-0 z-30 w-full border-b border-border-neutral">
        <WeekCalendar
          startWeekFromMonday={props.settings.startWeekFromMonday}
          selectedWeekCalendarFirstDayOfWeek={selectedWeekCalendarFirstDayOfWeek}
          history={sortedHistory}
          firstDayOfWeekToHistoryRecord={firstDayOfWeekToHistoryRecord}
          firstDayOfWeeks={firstDayOfWeeks}
          isLoading={isLoading}
          selectedFirstDayOfWeek={selectedFirstDayOfWeek}
          onClick={() => navigationRef.navigate("monthCalendarModal")}
          onSelectFirstDayOfWeek={(firstDayOfWeek) => {
            setSelectedWeekCalendarFirstDayOfWeek(firstDayOfWeek);
          }}
        />
      </div>
      <WeekInsights
        dispatch={props.dispatch}
        prs={prs}
        selectedFirstDayOfWeek={selectedFirstDayOfWeek}
        thisWeekHistory={thisWeekHistory}
        lastWeekHistory={lastWeekHistory}
        settings={props.settings}
        subscription={props.subscription}
      />
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-0 overflow-y-auto pt-36" ref={historyRecordsListRef}>
          {visibleHistory.length > 0 ? (
            <HistoryRecordsList
              history={visibleHistory}
              firstDayOfWeeks={firstDayOfWeeks}
              prs={prs}
              isOngoing={!!(props.progress && Progress_isCurrent(props.progress))}
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
    </section>
  );
}
