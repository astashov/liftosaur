import { JSX, useCallback, useEffect, useRef } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { IHistoryRecord } from "../types";
import { DateUtils_formatYYYYMMDD } from "../utils/date";
import { History_getDateToHistory } from "../models/history";
import { IconArrowRight } from "./icons/iconArrowRight";
import { IconSpinner } from "./icons/iconSpinner";
import { Progress_isCurrent } from "../models/progress";
import { IWeekCalendarPagerHandle, WeekCalendarPager } from "./weekCalendarPager";

interface IWeekCalendarProps {
  firstDayOfWeeks: number[];
  firstDayOfWeekToHistoryRecord: Partial<Record<number, IHistoryRecord>>;
  selectedFirstDayOfWeek: number;
  selectedWeekCalendarFirstDayOfWeek: number;
  isLoading: boolean;
  startWeekFromMonday?: boolean;
  onSelectFirstDayOfWeek: (week: number) => void;
  onClick: () => void;
  history: IHistoryRecord[];
}

export function WeekCalendar(props: IWeekCalendarProps): JSX.Element {
  const pagerRef = useRef<IWeekCalendarPagerHandle>(null);
  const dateToHistory = History_getDateToHistory(props.history);
  const selectedIndex = props.firstDayOfWeeks.findIndex((date) => date === props.selectedFirstDayOfWeek);
  const selectedWeekCalendarIndex = props.firstDayOfWeeks.findIndex(
    (date) => date === props.selectedWeekCalendarFirstDayOfWeek
  );

  const firstDayOfWeeksRef = useRef(props.firstDayOfWeeks);
  firstDayOfWeeksRef.current = props.firstDayOfWeeks;
  const onSelectFirstDayOfWeekRef = useRef(props.onSelectFirstDayOfWeek);
  onSelectFirstDayOfWeekRef.current = props.onSelectFirstDayOfWeek;

  useEffect(() => {
    if (selectedIndex >= 0) {
      pagerRef.current?.scrollToIndex(selectedIndex, false);
    }
  }, [selectedIndex]);

  const handlePageChange = useCallback((index: number) => {
    const firstDayOfWeek = firstDayOfWeeksRef.current[index];
    if (firstDayOfWeek != null) {
      onSelectFirstDayOfWeekRef.current(firstDayOfWeek);
    }
  }, []);

  const renderPage = useCallback(
    (firstDayOfWeek: number) => (
      <Pressable onPress={props.onClick}>
        <View className="flex-row justify-around w-full">
          {getWeekDays(firstDayOfWeek, dateToHistory, props.startWeekFromMonday).map((day, idx) => (
            <View key={idx} className="items-center justify-center">
              <Text className="text-xs text-text-secondary">{day.dayName}</Text>
              <View
                className={`items-center justify-center w-8 h-8 rounded-full ${
                  day.record && !Progress_isCurrent(day.record) ? "bg-background-error" : ""
                } ${day.isToday ? "border border-button-primarybackground" : ""}`}
              >
                <Text
                  className={`text-sm ${
                    day.record && !Progress_isCurrent(day.record) ? "text-text-alwayswhite" : "text-text-primary"
                  } ${day.isToday ? "font-bold" : ""}`}
                >
                  {day.dayNumber}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Pressable>
    ),
    [dateToHistory, props.startWeekFromMonday, props.onClick]
  );

  return (
    <View className="relative flex-row items-center justify-center w-full bg-background-default">
      {props.isLoading ? (
        <View className="absolute" style={{ left: 8, top: 28 }}>
          <IconSpinner width={12} height={12} />
        </View>
      ) : null}
      {selectedWeekCalendarIndex > 0 && (
        <View className="absolute top-0 left-0 z-10">
          <Pressable
            className="p-3"
            onPress={() => pagerRef.current?.scrollToIndex(selectedWeekCalendarIndex - 1, true)}
          >
            <View style={{ transform: [{ rotate: "180deg" }] }}>
              <IconArrowRight width={5} height={9} />
            </View>
          </Pressable>
        </View>
      )}
      {selectedWeekCalendarIndex < props.firstDayOfWeeks.length - 1 && (
        <View className="absolute top-0 right-0 z-10">
          <Pressable
            className="p-2"
            onPress={() => pagerRef.current?.scrollToIndex(selectedWeekCalendarIndex + 1, true)}
          >
            <IconArrowRight width={5} height={9} />
          </Pressable>
        </View>
      )}
      <View className="flex-1">
        <View className="py-2 mx-4">
          <WeekCalendarPager
            ref={pagerRef}
            data={props.firstDayOfWeeks}
            initialIndex={selectedIndex >= 0 ? selectedIndex : 0}
            onPageChange={handlePageChange}
            renderPage={renderPage}
          />
        </View>
      </View>
    </View>
  );
}

interface IWeekDay {
  record?: IHistoryRecord;
  date: Date;
  isToday: boolean;
  dayNumber: number;
  dayName: string;
}

const getWeekDays = (
  startDate: number,
  dateToHistory: Partial<Record<string, IHistoryRecord>>,
  startWeekFromMonday?: boolean
): IWeekDay[] => {
  const days = [];
  const dayNames = startWeekFromMonday ? ["M", "T", "W", "T", "F", "S", "S"] : ["S", "M", "T", "W", "T", "F", "S"];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const formatted = DateUtils_formatYYYYMMDD(date);
    days.push({
      record: dateToHistory[formatted],
      date,
      isToday: DateUtils_formatYYYYMMDD(date) === DateUtils_formatYYYYMMDD(new Date()),
      dayNumber: date.getDate(),
      dayName: dayNames[i],
    });
  }
  return days;
};
