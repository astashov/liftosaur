import { JSX, useCallback, useEffect, useRef, useState } from "react";
import { View, Pressable, FlatList, LayoutChangeEvent } from "react-native";
import { Text } from "./primitives/text";
import { IHistoryRecord } from "../types";
import { DateUtils_formatYYYYMMDD } from "../utils/date";
import { History_getDateToHistory } from "../models/history";
import { IconArrowRight } from "./icons/iconArrowRight";
import { IconSpinner } from "./icons/iconSpinner";
import { Progress_isCurrent } from "../models/progress";

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
  const flatListRef = useRef<FlatList>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const dateToHistory = History_getDateToHistory(props.history);
  const selectedIndex = props.firstDayOfWeeks.findIndex((date) => date === props.selectedFirstDayOfWeek);
  const selectedWeekCalendarIndex = props.firstDayOfWeeks.findIndex(
    (date) => date === props.selectedWeekCalendarFirstDayOfWeek
  );

  useEffect(() => {
    if (flatListRef.current && pageWidth > 0 && selectedIndex >= 0) {
      flatListRef.current.scrollToIndex({ index: selectedIndex, animated: false });
    }
  }, [pageWidth]);

  useEffect(() => {
    if (flatListRef.current && pageWidth > 0 && selectedIndex >= 0) {
      flatListRef.current.scrollToIndex({ index: selectedIndex, animated: false });
    }
  }, [selectedIndex]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0) {
      setPageWidth(width);
    }
  }, []);

  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      length: pageWidth,
      offset: pageWidth * index,
      index,
    }),
    [pageWidth]
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      const idx = viewableItems[0].index;
      const firstDayOfWeek = props.firstDayOfWeeks[idx];
      if (firstDayOfWeek != null) {
        props.onSelectFirstDayOfWeek(firstDayOfWeek);
      }
    }
  }).current;

  const scrollToIndex = useCallback(
    (index: number) => {
      if (flatListRef.current && pageWidth > 0) {
        flatListRef.current.scrollToIndex({ index, animated: true });
      }
    },
    [pageWidth]
  );

  const renderWeekPage = useCallback(
    ({ item: firstDayOfWeek }: { item: number }) => (
      <Pressable style={{ width: pageWidth }} onPress={props.onClick}>
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
    [pageWidth, dateToHistory, props.startWeekFromMonday, props.onClick]
  );

  const keyExtractor = useCallback((item: number) => String(item), []);

  return (
    <View className="relative flex-row items-center justify-center w-full bg-background-default">
      {props.isLoading ? (
        <View className="absolute" style={{ left: 8, top: 28 }}>
          <IconSpinner width={12} height={12} />
        </View>
      ) : null}
      {selectedWeekCalendarIndex > 0 && (
        <View className="absolute top-0 left-0 z-10">
          <Pressable className="p-3" onPress={() => scrollToIndex(selectedWeekCalendarIndex - 1)}>
            <View style={{ transform: [{ rotate: "180deg" }] }}>
              <IconArrowRight width={5} height={9} />
            </View>
          </Pressable>
        </View>
      )}
      {selectedWeekCalendarIndex < props.firstDayOfWeeks.length - 1 && (
        <View className="absolute top-0 right-0 z-10">
          <Pressable className="p-2" onPress={() => scrollToIndex(selectedWeekCalendarIndex + 1)}>
            <IconArrowRight width={5} height={9} />
          </Pressable>
        </View>
      )}
      <View className="flex-1">
        <View className="py-2 mx-4" onLayout={handleLayout}>
          {pageWidth > 0 && (
            <FlatList
              ref={flatListRef}
              data={props.firstDayOfWeeks}
              renderItem={renderWeekPage}
              keyExtractor={keyExtractor}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              getItemLayout={getItemLayout}
              initialScrollIndex={selectedIndex >= 0 ? selectedIndex : undefined}
              initialNumToRender={2}
              windowSize={3}
              maxToRenderPerBatch={3}
              onViewableItemsChanged={onViewableItemsChanged}
              onScrollToIndexFailed={() => {}}
            />
          )}
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
