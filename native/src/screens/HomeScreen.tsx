import React, { useMemo, useState, useCallback, useRef } from "react";
import { FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { IRootNavigation } from "../navigation/types";
import { useStoreState } from "../context/StoreContext";
import { useDispatch } from "../context/DispatchContext";
import { Program_getProgram, Program_evaluate, Program_getProgramDay } from "@shared/models/program";
import { Progress_getProgress, Progress_isCurrent } from "@shared/models/progress";
import { History_getPersonalRecords } from "@shared/models/history";
import { Program_nextHistoryRecord } from "@shared/models/program";
import { CollectionUtils_sort } from "@shared/utils/collection";
import { DateUtils_firstDayOfWeekTimestamp } from "@shared/utils/date";
import { HistoryRecordView } from "@crossplatform/components/HistoryRecordView";
import { HistoryRecordsNullState } from "@crossplatform/components/HistoryRecordsNullState";
import { WeekCalendar } from "@crossplatform/components/WeekCalendar";
import { WeekInsights } from "@crossplatform/components/WeekInsights";
import { History_getHistoryRecordsForTimerange } from "@shared/models/history";
import type { IHistoryRecord } from "@shared/types";
import type { ViewToken } from "react-native";

function getWeeksData(
  history: IHistoryRecord[],
  startWeekFromMonday?: boolean
): {
  firstDayOfWeeks: number[];
  firstDayOfWeekToHistoryRecord: Partial<Record<number, IHistoryRecord>>;
  historyRecordDateToFirstDayOfWeek: Partial<Record<number, number>>;
} {
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
  return { firstDayOfWeeks, historyRecordDateToFirstDayOfWeek, firstDayOfWeekToHistoryRecord };
}

export function HomeScreen(): React.ReactElement {
  const navigation = useNavigation<IRootNavigation>();
  const state = useStoreState();
  const dispatch = useDispatch();
  const settings = state.storage.settings;
  const history = state.storage.history;
  const progress = Progress_getProgress(state);

  const currentProgram = state.storage.currentProgramId
    ? Program_getProgram(state, state.storage.currentProgramId)
    : undefined;

  const prs = useMemo(() => History_getPersonalRecords(history), [history]);

  const evaluatedProgram = useMemo(
    () => (currentProgram ? Program_evaluate(currentProgram, settings) : undefined),
    [currentProgram, settings]
  );
  const programDay = evaluatedProgram ? Program_getProgramDay(evaluatedProgram, evaluatedProgram.nextDay) : undefined;

  const sortedHistory = useMemo(() => {
    const sorted = CollectionUtils_sort(history, (a, b) => {
      return new Date(Date.parse(b.date)).getTime() - new Date(Date.parse(a.date)).getTime();
    });
    if (progress) {
      sorted.unshift(progress);
    } else if (currentProgram) {
      const nextRecord = Program_nextHistoryRecord(currentProgram, settings, state.storage.stats);
      sorted.unshift(nextRecord);
    }
    return sorted;
  }, [history, progress, currentProgram, settings]);

  const { firstDayOfWeeks, firstDayOfWeekToHistoryRecord, historyRecordDateToFirstDayOfWeek } = useMemo(
    () => getWeeksData(sortedHistory, settings.startWeekFromMonday),
    [sortedHistory, settings.startWeekFromMonday]
  );

  const [selectedFirstDayOfWeek, setSelectedFirstDayOfWeek] = useState(firstDayOfWeeks[firstDayOfWeeks.length - 1]);
  const [selectedWeekCalendarFirstDayOfWeek, setSelectedWeekCalendarFirstDayOfWeek] = useState(selectedFirstDayOfWeek);

  const isOngoing = progress != null && Progress_isCurrent(progress);

  const previousWeekFirstDay = useMemo(() => {
    const d = new Date(selectedFirstDayOfWeek);
    d.setDate(d.getDate() - 7);
    return d.getTime();
  }, [selectedFirstDayOfWeek]);

  const thisWeekHistory = useMemo(
    () =>
      History_getHistoryRecordsForTimerange(
        sortedHistory,
        selectedFirstDayOfWeek,
        "week",
        settings.startWeekFromMonday
      ),
    [sortedHistory, selectedFirstDayOfWeek, settings.startWeekFromMonday]
  );
  const lastWeekHistory = useMemo(
    () =>
      History_getHistoryRecordsForTimerange(sortedHistory, previousWeekFirstDay, "week", settings.startWeekFromMonday),
    [sortedHistory, previousWeekFirstDay, settings.startWeekFromMonday]
  );

  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        const firstVisible = viewableItems[0].item as IHistoryRecord;
        const week = historyRecordDateToFirstDayOfWeek[firstVisible.id];
        if (week != null && week !== selectedFirstDayOfWeek) {
          setSelectedFirstDayOfWeek(week);
        }
      }
    },
    [historyRecordDateToFirstDayOfWeek, selectedFirstDayOfWeek]
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderItem = ({ item }: { item: IHistoryRecord }): React.ReactElement => (
    <HistoryRecordView
      historyRecord={item}
      showTitle={true}
      programDay={programDay}
      isOngoing={isOngoing}
      prs={prs}
      settings={settings}
      dispatch={dispatch}
    />
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-default">
      <View className="border-b border-border-neutral">
        <WeekCalendar
          startWeekFromMonday={settings.startWeekFromMonday}
          selectedWeekCalendarFirstDayOfWeek={selectedWeekCalendarFirstDayOfWeek}
          history={sortedHistory}
          firstDayOfWeekToHistoryRecord={firstDayOfWeekToHistoryRecord}
          firstDayOfWeeks={firstDayOfWeeks}
          isLoading={false}
          selectedFirstDayOfWeek={selectedFirstDayOfWeek}
          onClick={() => navigation.navigate("MonthCalendarSheet", { selectedFirstDayOfWeek })}
          onSelectFirstDayOfWeek={setSelectedWeekCalendarFirstDayOfWeek}
        />
      </View>
      <FlatList
        ref={flatListRef}
        data={sortedHistory}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <WeekInsights
            prs={prs}
            thisWeekHistory={thisWeekHistory}
            lastWeekHistory={lastWeekHistory}
            selectedFirstDayOfWeek={selectedFirstDayOfWeek}
            settings={settings}
            subscription={state.storage.subscription}
            dispatch={dispatch}
            onShowMore={() => navigation.navigate("WeekInsightsSheet", { selectedFirstDayOfWeek })}
          />
        }
        ListEmptyComponent={<HistoryRecordsNullState />}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />
    </SafeAreaView>
  );
}
