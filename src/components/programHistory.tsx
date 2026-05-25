import { JSX, useCallback, useEffect, useRef, useState } from "react";
import { useTimedMemo } from "../utils/useTimedMemo";
import { usePerfScrollMarkers } from "../utils/usePerfScrollMarkers";
import { View } from "react-native";
import { LegendList, LegendListRef } from "@legendapp/list";
import { IDispatch } from "../ducks/types";
import { IProgram, IHistoryRecord, ISettings, ISubscription } from "../types";
import { INavCommon, IState, updateState } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";
import { History_getHistoryRecordsForTimerange, History_getHomeAggregates } from "../models/history";
import { WeekInsights } from "./weekInsights";
import { lb } from "lens-shmens";
import { WeekCalendar } from "./weekCalendar";
import { HistoryRecordsNullState } from "./historyRecordsNullState";
import { Progress_isCurrent } from "../models/progress";
import { Program_nextHistoryRecord } from "../models/program";
import { navigateToModal } from "../navigation/navigationService";
import { useTrackedState } from "../navigation/TrackedStateContext";
import { HistoryRecordView } from "./historyRecord";
import { Program_evaluate, Program_getProgramDay } from "../models/program";
import { Reps_group } from "../models/set";

interface IProps {
  program: IProgram;
  progress?: IHistoryRecord;
  history: IHistoryRecord[];
  settings: ISettings;
  subscription: ISubscription;
  navCommon: INavCommon;
  dispatch: IDispatch;
  initialHistoryRecordId?: number;
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
  const aggregates = useTimedMemo(
    "programHistory.aggregates",
    () => History_getHomeAggregates(props.history, !!props.settings.startWeekFromMonday),
    [props.history, props.settings.startWeekFromMonday]
  );
  const { sortedHistoryDesc, weeksData, prs } = aggregates;
  const { firstDayOfWeeks, historyRecordDateToFirstDayOfWeek, firstDayOfWeekToHistoryRecord } = weeksData;

  const sortedHistory = useTimedMemo(
    "programHistory.sortedHistory",
    () => {
      if (!props.progress && (!props.program || sortedHistoryDesc.length === 0)) {
        return sortedHistoryDesc;
      }
      const arr = sortedHistoryDesc.slice();
      if (props.progress) {
        arr.unshift(props.progress);
      } else if (props.program) {
        arr.unshift(Program_nextHistoryRecord(props.program, props.settings, props.navCommon.stats));
      }
      return arr;
    },
    [sortedHistoryDesc, props.progress, props.program, props.settings, props.navCommon.stats]
  );

  const [selectedFirstDayOfWeek, setSelectedWeekFirstDay] = useState(firstDayOfWeeks[firstDayOfWeeks.length - 1]);
  const previousWeekFirstDayDate = new Date(selectedFirstDayOfWeek);
  previousWeekFirstDayDate.setDate(previousWeekFirstDayDate.getDate() - 7);
  const previousWeekFirstDay = previousWeekFirstDayDate.getTime();
  const [selectedWeekCalendarFirstDayOfWeek, setSelectedWeekCalendarFirstDayOfWeek] = useState(selectedFirstDayOfWeek);

  const thisWeekHistory = useTimedMemo(
    "programHistory.thisWeekHistory",
    () => getWeekHistory(sortedHistory, selectedFirstDayOfWeek, props.settings.startWeekFromMonday),
    [sortedHistory, selectedFirstDayOfWeek, props.settings.startWeekFromMonday]
  );
  const lastWeekHistory = useTimedMemo(
    "programHistory.lastWeekHistory",
    () => getWeekHistory(sortedHistory, previousWeekFirstDay, props.settings.startWeekFromMonday),
    [sortedHistory, previousWeekFirstDay, props.settings.startWeekFromMonday]
  );
  const loadingItems = props.navCommon.loading.items;
  const loadingKeys = Object.keys(loadingItems).filter((k) => loadingItems[k]?.endTime == null);
  const isLoading = Object.keys(loadingKeys).length > 0;

  const programDay = useTimedMemo(
    "programHistory.programDay",
    () => {
      const program = Program_evaluate(props.program, props.settings);
      return Program_getProgramDay(program, program.nextDay);
    },
    [props.program, props.settings]
  );
  const isOngoing = !!(props.progress && Progress_isCurrent(props.progress));

  const flatListRef = useRef<LegendListRef>(null);
  const historyRecordDateToFirstDayOfWeekRef = useRef(historyRecordDateToFirstDayOfWeek);
  historyRecordDateToFirstDayOfWeekRef.current = historyRecordDateToFirstDayOfWeek;
  const selectedFirstDayOfWeekRef = useRef(selectedFirstDayOfWeek);
  selectedFirstDayOfWeekRef.current = selectedFirstDayOfWeek;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ item: IHistoryRecord }> }) => {
    if (viewableItems.length > 0) {
      const firstVisibleRecord = viewableItems[0].item;
      const firstDayOfWeek = historyRecordDateToFirstDayOfWeekRef.current[firstVisibleRecord.id];
      if (firstDayOfWeek != null && firstDayOfWeek !== selectedFirstDayOfWeekRef.current) {
        setSelectedWeekFirstDay(firstDayOfWeek);
      }
    }
  }).current;

  const initialHistoryRecordId = props.initialHistoryRecordId;

  useEffect(() => {
    if (initialHistoryRecordId != null && flatListRef.current) {
      const index = sortedHistory.findIndex((record) => record.id === initialHistoryRecordId);
      if (index >= 0) {
        flatListRef.current.scrollToIndex({ index, animated: false });
      }
    }
  }, [initialHistoryRecordId]);

  const trackedState = useTrackedState();
  const scrollToRecordId = trackedState.scrollToHistoryRecordId;
  useEffect(() => {
    if (scrollToRecordId != null) {
      updateState(props.dispatch, [lb<IState>().p("scrollToHistoryRecordId").record(undefined)], "Clear scroll target");
      const index = sortedHistory.findIndex((record) => record.id === scrollToRecordId);
      if (index >= 0 && flatListRef.current) {
        flatListRef.current.scrollToIndex({ index, animated: false });
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index, animated: false });
        }, 200);
      }
    }
  }, [scrollToRecordId]);

  useNavOptions({ navHidden: true });

  const getEstimatedItemSize = useCallback((_index: number, item: IHistoryRecord) => estimateRecordHeight(item), []);

  const renderItem = useCallback(
    ({ item }: { item: IHistoryRecord }) => (
      <View key={item.id} className="mx-4 mb-6">
        <HistoryRecordView
          isOngoing={isOngoing}
          showTitle={true}
          programDay={programDay}
          prs={prs}
          settings={props.settings}
          historyRecord={item}
          dispatch={dispatch}
        />
      </View>
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
          onClick={() => navigateToModal("monthCalendarModal")}
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

  const scrollMarkers = usePerfScrollMarkers("ProgramHistoryView");

  return (
    <View className="flex-1">
      {stickyHeader}
      <LegendList
        ref={flatListRef}
        data={sortedHistory}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getEstimatedItemSize={getEstimatedItemSize}
        onViewableItemsChanged={onViewableItemsChanged}
        onScrollBeginDrag={scrollMarkers.onScrollBeginDrag}
        onScrollEndDrag={scrollMarkers.onScrollEndDrag}
        onMomentumScrollEnd={scrollMarkers.onMomentumScrollEnd}
      />
    </View>
  );
}

function estimateRecordHeight(record: IHistoryRecord): number {
  const isCurrent = Progress_isCurrent(record);
  // pt-2(8) + title(26) + mb-6(24) = 58
  const outerHeight = 58;
  // py-4(32) + program name section pb-2(42) + border(2) = 76
  const cardBase = 76;
  // Stats row or Start/Continue button
  const bottomSection = isCurrent ? 52 : 44;

  let entriesHeight = 0;
  for (const entry of record.entries) {
    const setGroups = Reps_group(entry.sets, isCurrent).length;
    // py-2(16) + max(image 36, content). Content = set groups stacked at ~18px each, min 32px
    const contentHeight = Math.max(36, setGroups * 18);
    entriesHeight += 16 + contentHeight;
  }

  return outerHeight + cardBase + entriesHeight + bottomSection;
}
