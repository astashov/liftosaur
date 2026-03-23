import React, { memo, useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import {
  DateUtils_formatYYYYMMDD,
  DateUtils_lastDayOfWeekTimestamp,
  DateUtils_firstDayOfWeekTimestamp,
} from "@shared/utils/date";
import type { IHistoryRecord } from "@shared/types";
import { StringUtils_pluralize } from "@shared/utils/string";
import { IPersonalRecords, History_getNumberOfPersonalRecords } from "@shared/models/history";
import { CollectionUtils_compact } from "@shared/utils/collection";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";
import { Progress_isCurrent } from "@shared/models/progress";
import type { ScrollView as ScrollViewType } from "react-native";

interface IProps {
  firstDayOfWeeks: number[];
  selectedFirstDayOfWeekIndex: number;
  startWeekFromMonday?: boolean;
  visibleRecords: number;
  prs: IPersonalRecords;
  history: IHistoryRecord[];
  onClick: (historyRecord: IHistoryRecord) => void;
}

export const MonthCalendar = memo((props: IProps): React.ReactElement => {
  const scrollRef = useRef<ScrollViewType>(null);
  const monthLayouts = useRef<Record<string, number>>({});

  useEffect(() => {
    const selectedTs = props.firstDayOfWeeks[props.selectedFirstDayOfWeekIndex];
    if (selectedTs != null) {
      const d = new Date(selectedTs);
      const key = DateUtils_formatYYYYMMDD(new Date(d.getFullYear(), d.getMonth(), 1));
      const y = monthLayouts.current[key];
      if (y != null) {
        scrollRef.current?.scrollTo({ y, animated: false });
      }
    }
  }, [props.firstDayOfWeeks, props.selectedFirstDayOfWeekIndex]);

  const start = new Date(Math.max(props.firstDayOfWeeks[0], new Date(2015, 1, 1).getTime()));
  start.setDate(1);
  const end = new Date(
    DateUtils_lastDayOfWeekTimestamp(props.firstDayOfWeeks[props.firstDayOfWeeks.length - 1], props.startWeekFromMonday)
  );
  end.setDate(1);
  const months: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }
  const today = DateUtils_formatYYYYMMDD(new Date());
  const monthToHistoryRecords = props.history.reduce<
    Partial<Record<string, Partial<Record<string, IHistoryRecord[]>>>>
  >((acc, record) => {
    const d = new Date(Date.parse(record.date));
    d.setDate(1);
    const month = DateUtils_formatYYYYMMDD(d);
    acc[month] = acc[month] || {};
    const day = new Date(Date.parse(record.date)).getDate();
    acc[month]![day] = acc[month]![day] || [];
    acc[month]![day]!.push(record);
    return acc;
  }, {});

  return (
    <ScrollView ref={scrollRef} className="flex-1 p-3">
      {months.map((month) => {
        const year = month.getFullYear();
        const monthIndex = month.getMonth();
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        let firstDayOfWeek = month.getDay();
        if (props.startWeekFromMonday) {
          firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
        }

        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const dayToHistoryRecords = monthToHistoryRecords[DateUtils_formatYYYYMMDD(month)] || {};
        const historyRecords = CollectionUtils_compact(Object.values(dayToHistoryRecords).flat()).filter(
          (hr) => !Progress_isCurrent(hr)
        );
        const numberOfWorkouts = historyRecords.length;
        const numberOfPersonalRecords = History_getNumberOfPersonalRecords(historyRecords, props.prs);
        const monthKey = DateUtils_formatYYYYMMDD(month);

        return (
          <View
            key={monthKey}
            className="mb-8"
            onLayout={(e) => {
              monthLayouts.current[monthKey] = e.nativeEvent.layout.y;
            }}
          >
            <Text className="text-lg font-semibold">
              {month.toLocaleString("default", { month: "long", year: "numeric" })}
            </Text>
            <Text className="text-sm">
              {`${numberOfWorkouts} ${StringUtils_pluralize("workout", numberOfWorkouts)} · \ud83c\udfc6 ${numberOfPersonalRecords} ${StringUtils_pluralize("PR", numberOfPersonalRecords)}`}
            </Text>
            <View className="flex-row flex-wrap mt-2">
              {Array(firstDayOfWeek)
                .fill(null)
                .map((_, i) => (
                  <View key={`empty-${i}`} style={{ width: "14.28%" }} className="p-2" />
                ))}
              {days.map((day) => {
                const date = new Date(year, monthIndex, day);
                const yyyymmdd = DateUtils_formatYYYYMMDD(date);
                const historyRecord = dayToHistoryRecords[day]?.[0];
                const isWorkout = !!historyRecord && !Progress_isCurrent(historyRecord);
                const selectedFirstDayOfWeek = props.firstDayOfWeeks[props.selectedFirstDayOfWeekIndex];
                const thisFirstDayOfWeek = DateUtils_firstDayOfWeekTimestamp(date, props.startWeekFromMonday);
                const isSelectedWeek = selectedFirstDayOfWeek === thisFirstDayOfWeek;

                return (
                  <Pressable
                    key={yyyymmdd}
                    style={{
                      width: "14.28%",
                      backgroundColor: isSelectedWeek ? Tailwind_semantic().background.subtle : "transparent",
                    }}
                    className="items-center justify-center p-2"
                    onPress={() => {
                      if (historyRecord != null) {
                        props.onClick(historyRecord);
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
                          isWorkout
                            ? "text-text-alwayswhite"
                            : date > new Date()
                              ? "text-text-disabled"
                              : "text-text-primary"
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
      })}
    </ScrollView>
  );
});
