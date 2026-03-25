import { useRef, useEffect, useCallback, useState } from "react";
import type { JSX } from "react";
import { View, Text, Pressable, ScrollView, useWindowDimensions } from "react-native";
import type { IHistoryRecord } from "@shared/types";
import { DateUtils_formatYYYYMMDD } from "@shared/utils/date";
import { History_getDateToHistory } from "@shared/models/history";
import { IconArrowRight } from "./icons/IconArrowRight";
import { IconSpinner } from "./icons/IconSpinner";
import { Progress_isCurrent } from "@shared/models/progress";
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView as ScrollViewType } from "react-native";

interface IProps {
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

export function WeekCalendar(props: IProps): JSX.Element {
  const scrollRef = useRef<ScrollViewType>(null);
  const { width: screenWidth } = useWindowDimensions();
  const contentWidth = screenWidth - 32;
  const dateToHistory = History_getDateToHistory(props.history);
  const selectedIndex = props.firstDayOfWeeks.findIndex((d) => d === props.selectedFirstDayOfWeek);
  const [calendarIndex, setCalendarIndex] = useState(
    selectedIndex >= 0 ? selectedIndex : props.firstDayOfWeeks.length - 1
  );

  useEffect(() => {
    const idx = selectedIndex >= 0 ? selectedIndex : props.firstDayOfWeeks.length - 1;
    setTimeout(() => {
      scrollRef.current?.scrollTo({ x: idx * contentWidth, animated: false });
    }, 50);
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const idx = Math.round(offsetX / contentWidth);
      const firstDayOfWeek = props.firstDayOfWeeks[idx];
      if (firstDayOfWeek != null) {
        setCalendarIndex(idx);
        props.onSelectFirstDayOfWeek(firstDayOfWeek);
      }
    },
    [contentWidth, props.firstDayOfWeeks]
  );

  const scrollToIndex = (idx: number): void => {
    scrollRef.current?.scrollTo({ x: idx * contentWidth, animated: true });
  };

  return (
    <View className="flex-row items-center justify-center w-full bg-background-default">
      {props.isLoading && (
        <View className="absolute" style={{ left: 8, top: 28 }}>
          <IconSpinner width={12} height={12} />
        </View>
      )}
      {calendarIndex > 0 && (
        <Pressable className="absolute left-0 top-0 p-3 z-10" onPress={() => scrollToIndex(calendarIndex - 1)}>
          <IconArrowRight className="rotate-180" width={5} height={9} />
        </Pressable>
      )}
      {calendarIndex < props.firstDayOfWeeks.length - 1 && (
        <Pressable className="absolute right-0 top-0 p-2 z-10" onPress={() => scrollToIndex(calendarIndex + 1)}>
          <IconArrowRight width={5} height={9} />
        </Pressable>
      )}
      <Pressable onPress={props.onClick} className="mx-4">
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          style={{ width: contentWidth }}
        >
          {props.firstDayOfWeeks.map((firstDayOfWeek, index) => (
            <View key={index} style={{ width: contentWidth }} className="py-2">
              <View className="flex-row justify-around w-full">
                {getWeekDays(firstDayOfWeek, dateToHistory, props.startWeekFromMonday).map((day) => (
                  <View key={day.dayName + day.dayNumber} className="items-center justify-center">
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
            </View>
          ))}
        </ScrollView>
      </Pressable>
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

function getWeekDays(
  startDate: number,
  dateToHistory: Partial<Record<string, IHistoryRecord>>,
  startWeekFromMonday?: boolean
): IWeekDay[] {
  const days: IWeekDay[] = [];
  const dayNames = startWeekFromMonday ? ["M", "T", "W", "T", "F", "S", "S"] : ["S", "M", "T", "W", "T", "F", "S"];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const formatted = DateUtils_formatYYYYMMDD(date);
    days.push({
      record: dateToHistory[formatted],
      date,
      isToday: formatted === DateUtils_formatYYYYMMDD(new Date()),
      dayNumber: date.getDate(),
      dayName: dayNames[i],
    });
  }
  return days;
}
