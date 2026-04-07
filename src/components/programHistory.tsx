import { JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, FlatList } from "react-native";
import { IDispatch } from "../ducks/types";
import { IProgram, IHistoryRecord, ISettings, ISubscription } from "../types";
import { INavCommon, IState, updateState } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";
import { DateUtils_firstDayOfWeekTimestamp } from "../utils/date";
import { History_getHistoryRecordsForTimerange, History_getPersonalRecords } from "../models/history";
import { WeekInsights } from "./weekInsights";
import { lb } from "lens-shmens";
import { WeekCalendar } from "./weekCalendar";
import { HistoryRecordsNullState } from "./historyRecordsNullState";
import { CollectionUtils_sort } from "../utils/collection";
import { Progress_isCurrent } from "../models/progress";
import { Program_nextHistoryRecord } from "../models/program";
import { navigationRef } from "../navigation/navigationRef";
import { useAppState } from "../navigation/StateContext";
import { HistoryRecordView } from "./historyRecord";
import { Program_evaluate, Program_getProgramDay } from "../models/program";

interface IProps {
  program: IProgram;
  progress?: IHistoryRecord;
  history: IHistoryRecord[];
  settings: ISettings;
  subscription: ISubscription;
  navCommon: INavCommon;
  dispatch: IDispatch;
  scrollContainerRef?: React.RefObject<any>;
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

  const { firstDayOfWeeks, historyRecordDateToFirstDayOfWeek, firstDayOfWeekToHistoryRecord } = getWeeksData(
    sortedHistory,
    props.settings.startWeekFromMonday
  );
  const [selectedFirstDayOfWeek, setSelectedWeekFirstDay] = useState(firstDayOfWeeks[firstDayOfWeeks.length - 1]);
  const previousWeekFirstDayDate = new Date(selectedFirstDayOfWeek);
  previousWeekFirstDayDate.setDate(previousWeekFirstDayDate.getDate() - 7);
  const previousWeekFirstDay = previousWeekFirstDayDate.getTime();
  const [selectedWeekCalendarFirstDayOfWeek, setSelectedWeekCalendarFirstDayOfWeek] = useState(selectedFirstDayOfWeek);

  const prs = History_getPersonalRecords(props.history);
  const thisWeekHistory = getWeekHistory(sortedHistory, selectedFirstDayOfWeek, props.settings.startWeekFromMonday);
  const lastWeekHistory = getWeekHistory(sortedHistory, previousWeekFirstDay, props.settings.startWeekFromMonday);
  const loadingItems = props.navCommon.loading.items;
  const loadingKeys = Object.keys(loadingItems).filter((k) => loadingItems[k]?.endTime == null);
  const isLoading = Object.keys(loadingKeys).length > 0;

  const program = Program_evaluate(props.program, props.settings);
  const programDay = Program_getProgramDay(program, program.nextDay);
  const isOngoing = !!(props.progress && Progress_isCurrent(props.progress));

  const flatListRef = useRef<FlatList>(null);
  const historyRecordDateToFirstDayOfWeekRef = useRef(historyRecordDateToFirstDayOfWeek);
  historyRecordDateToFirstDayOfWeekRef.current = historyRecordDateToFirstDayOfWeek;
  const selectedFirstDayOfWeekRef = useRef(selectedFirstDayOfWeek);
  selectedFirstDayOfWeekRef.current = selectedFirstDayOfWeek;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: IHistoryRecord }> }) => {
      if (viewableItems.length > 0) {
        const firstVisibleRecord = viewableItems[0].item;
        const firstDayOfWeek = historyRecordDateToFirstDayOfWeekRef.current[firstVisibleRecord.id];
        if (firstDayOfWeek != null && firstDayOfWeek !== selectedFirstDayOfWeekRef.current) {
          setSelectedWeekFirstDay(firstDayOfWeek);
        }
      }
    }
  ).current;

  const initialHistoryRecordId = props.initialHistoryRecordId;

  useEffect(() => {
    if (initialHistoryRecordId != null && flatListRef.current) {
      const index = sortedHistory.findIndex((record) => record.id === initialHistoryRecordId);
      if (index >= 0) {
        flatListRef.current.scrollToIndex({ index, animated: false });
      }
    }
  }, [initialHistoryRecordId]);

  const { state: appState } = useAppState();
  const scrollToRecordId = appState.scrollToHistoryRecordId;
  useEffect(() => {
    if (scrollToRecordId != null) {
      updateState(props.dispatch, [lb<IState>().p("scrollToHistoryRecordId").record(undefined)], "Clear scroll target");
      const index = sortedHistory.findIndex((record) => record.id === scrollToRecordId);
      if (index >= 0 && flatListRef.current) {
        flatListRef.current.scrollToIndex({ index, animated: true });
      }
    }
  }, [scrollToRecordId]);

  useNavOptions({ navHidden: true });

  const renderItem = useCallback(
    ({ item }: { item: IHistoryRecord }) => (
      <HistoryRecordView
        key={item.id}
        isOngoing={isOngoing}
        showTitle={true}
        programDay={programDay}
        prs={prs}
        settings={props.settings}
        historyRecord={item}
        dispatch={dispatch}
      />
    ),
    [isOngoing, programDay, prs, props.settings, dispatch]
  );

  const keyExtractor = useCallback((item: IHistoryRecord) => String(item.id), []);

  const stickyHeader = (
    <View>
      <View className="border-b border-border-neutral">
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
      </View>
      <WeekInsights
        dispatch={props.dispatch}
        prs={prs}
        selectedFirstDayOfWeek={selectedFirstDayOfWeek}
        thisWeekHistory={thisWeekHistory}
        lastWeekHistory={lastWeekHistory}
        settings={props.settings}
        subscription={props.subscription}
      />
    </View>
  );

  if (sortedHistory.length === 0) {
    return (
      <View className="flex-1">
        {stickyHeader}
        <HistoryRecordsNullState />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {stickyHeader}
      <FlatList
        ref={flatListRef}
        data={sortedHistory}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        initialNumToRender={3}
      maxToRenderPerBatch={6}
      windowSize={5}
      onScrollToIndexFailed={(info) => {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
        }, 100);
      }}
      onViewableItemsChanged={onViewableItemsChanged}
    />
    </View>
  );
}
