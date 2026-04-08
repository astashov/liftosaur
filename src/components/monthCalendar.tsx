import { JSX, memo, useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import { View, Pressable, FlatList } from "react-native";
import { Text } from "./primitives/text";
import { DateUtils_formatYYYYMMDD, DateUtils_firstDayOfWeekTimestamp } from "../utils/date";
import { IHistoryRecord } from "../types";
import { StringUtils_pluralize } from "../utils/string";
import { IPersonalRecords, History_getNumberOfPersonalRecords } from "../models/history";
import { CollectionUtils_compact } from "../utils/collection";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { Progress_isCurrent } from "../models/progress";

interface IMonthCalendarProps {
  firstDayOfWeeks: number[];
  selectedFirstDayOfWeekIndex: number;
  startWeekFromMonday?: boolean;
  visibleRecords: number;
  prs: IPersonalRecords;
  history: IHistoryRecord[];
  onClick: (historyRecord: IHistoryRecord) => void;
}

export interface IMonthCalendarRef {
  scrollToSelected: () => void;
}

interface IMonthData {
  month: Date;
  key: string;
  dayToHistoryRecords: Partial<Record<number, IHistoryRecord[]>>;
  numberOfWorkouts: number;
  numberOfPersonalRecords: number;
}

export const MonthCalendar = memo(
  forwardRef<IMonthCalendarRef, IMonthCalendarProps>((props, ref) => {
    const flatListRef = useRef<FlatList>(null);

    const { months, selectedMonthIndex } = useMemo(() => {
      const start = new Date(Math.max(props.firstDayOfWeeks[0], new Date(2015, 1, 1).getTime()));
      start.setDate(1);
      const end = new Date(props.firstDayOfWeeks[props.firstDayOfWeeks.length - 1]);
      end.setDate(1);

      const monthToHistoryRecords = props.history.reduce<
        Partial<Record<string, Partial<Record<number, IHistoryRecord[]>>>>
      >((acc, record) => {
        const d = new Date(Date.parse(record.date));
        d.setDate(1);
        const monthKey = DateUtils_formatYYYYMMDD(d);
        acc[monthKey] = acc[monthKey] || {};
        const day = new Date(Date.parse(record.date)).getDate();
        acc[monthKey]![day] = acc[monthKey]![day] || [];
        acc[monthKey]![day]!.push(record);
        return acc;
      }, {});

      const result: IMonthData[] = [];
      const current = new Date(start);
      while (current <= end) {
        const key = DateUtils_formatYYYYMMDD(new Date(current));
        const dayToHistoryRecords = monthToHistoryRecords[key] || {};
        const historyRecords = CollectionUtils_compact(Object.values(dayToHistoryRecords).flat()).filter(
          (hr) => !Progress_isCurrent(hr)
        );
        result.push({
          month: new Date(current),
          key,
          dayToHistoryRecords,
          numberOfWorkouts: historyRecords.length,
          numberOfPersonalRecords: History_getNumberOfPersonalRecords(historyRecords, props.prs),
        });
        current.setMonth(current.getMonth() + 1);
      }

      result.reverse();

      let selectedIdx = 0;
      const selectedFirstDayOfWeekTs = props.firstDayOfWeeks[props.selectedFirstDayOfWeekIndex];
      if (selectedFirstDayOfWeekTs != null) {
        const selectedDate = new Date(selectedFirstDayOfWeekTs);
        const selectedMonthKey = DateUtils_formatYYYYMMDD(
          new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
        );
        const idx = result.findIndex((m) => m.key === selectedMonthKey);
        if (idx >= 0) {
          selectedIdx = idx;
        }
      }

      return { months: result, selectedMonthIndex: selectedIdx };
    }, [props.firstDayOfWeeks, props.selectedFirstDayOfWeekIndex, props.startWeekFromMonday, props.history, props.prs]);

    useImperativeHandle(
      ref,
      () => ({
        scrollToSelected: () => {
          if (flatListRef.current && selectedMonthIndex >= 0) {
            flatListRef.current.scrollToIndex({ index: selectedMonthIndex, animated: true, viewPosition: 0.5 });
          }
        },
      }),
      [selectedMonthIndex]
    );

    const today = DateUtils_formatYYYYMMDD(new Date());
    const selectedFirstDayOfWeek = props.firstDayOfWeeks[props.selectedFirstDayOfWeekIndex];

    const renderMonth = useCallback(
      ({ item }: { item: IMonthData }) => (
        <MonthItem
          item={item}
          startWeekFromMonday={props.startWeekFromMonday}
          selectedFirstDayOfWeek={selectedFirstDayOfWeek}
          today={today}
          onClick={props.onClick}
        />
      ),
      [props.startWeekFromMonday, props.onClick, selectedFirstDayOfWeek, today]
    );

    const keyExtractor = useCallback((item: IMonthData) => item.key, []);

    return (
      <FlatList
        ref={flatListRef}
        data={months}
        renderItem={renderMonth}
        keyExtractor={keyExtractor}
        inverted
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={2}
      />
    );
  })
);

interface IMonthItemProps {
  item: IMonthData;
  startWeekFromMonday?: boolean;
  selectedFirstDayOfWeek: number;
  today: string;
  onClick: (historyRecord: IHistoryRecord) => void;
}

const MonthItem = memo(function MonthItem(props: IMonthItemProps): JSX.Element {
  const { item, startWeekFromMonday, selectedFirstDayOfWeek, today, onClick } = props;
  const { month, dayToHistoryRecords, numberOfWorkouts, numberOfPersonalRecords } = item;
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  let firstDayOfWeek = month.getDay();
  if (startWeekFromMonday) {
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  }
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <View className="px-3 mb-8">
      <Text className="text-lg font-semibold">
        {month.toLocaleString("default", { month: "long", year: "numeric" })}
      </Text>
      <Text className="text-sm">
        <Text>
          {numberOfWorkouts} {StringUtils_pluralize("workout", numberOfWorkouts)}
        </Text>
        <Text> {"\u00B7"} </Text>
        <Text>
          {"\u{1F3C6}"} {numberOfPersonalRecords} {StringUtils_pluralize("PR", numberOfPersonalRecords)}
        </Text>
      </Text>
      <View className="flex-row flex-wrap mt-2">
        {Array(firstDayOfWeek)
          .fill(null)
          .map((_, i) => (
            <View key={`empty-${i}`} style={{ width: "14.285%" }} className="items-center justify-center p-2">
              <View className="w-8 h-8" />
            </View>
          ))}
        {days.map((day) => {
          const date = new Date(year, monthIndex, day);
          const yyyymmdd = DateUtils_formatYYYYMMDD(date);
          const historyRecord = dayToHistoryRecords[day]?.[0];
          const isWorkout = !!historyRecord && !Progress_isCurrent(historyRecord);
          const thisFirstDayOfWeek = DateUtils_firstDayOfWeekTimestamp(date, startWeekFromMonday);
          const isSelectedWeek = selectedFirstDayOfWeek === thisFirstDayOfWeek;

          return (
            <Pressable
              key={yyyymmdd}
              style={{
                width: "14.285%",
                backgroundColor: isSelectedWeek ? Tailwind_semantic().background.subtle : "transparent",
              }}
              className="items-center justify-center p-2"
              onPress={() => {
                if (historyRecord != null) {
                  onClick(historyRecord);
                }
              }}
            >
              <View
                className={`w-8 h-8 rounded-full items-center justify-center ${
                  isWorkout ? "bg-background-error" : ""
                } ${yyyymmdd === today ? "border border-button-primarybackground" : ""}`}
              >
                <Text
                  className={`${
                    isWorkout ? "text-text-alwayswhite" : date > new Date() ? "text-text-disabled" : "text-text-primary"
                  } ${yyyymmdd === today ? "font-bold" : ""}`}
                >
                  {day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});
