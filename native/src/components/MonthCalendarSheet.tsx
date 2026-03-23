import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useStoreState } from "../context/StoreContext";
import { MonthCalendar } from "@crossplatform/components/MonthCalendar";
import { History_getPersonalRecords } from "@shared/models/history";
import { CollectionUtils_sort } from "@shared/utils/collection";
import { Progress_isCurrent } from "@shared/models/progress";
import { DateUtils_firstDayOfWeekTimestamp } from "@shared/utils/date";
import type { IHistoryRecord } from "@shared/types";
import { LinkButton } from "@crossplatform/components/LinkButton";

function getFirstDayOfWeeks(history: IHistoryRecord[], startWeekFromMonday?: boolean): number[] {
  const set: Set<number> = new Set();
  for (const record of history) {
    if (!Progress_isCurrent(record)) {
      set.add(DateUtils_firstDayOfWeekTimestamp(record.endTime ?? record.startTime, startWeekFromMonday));
    }
  }
  if (set.size === 0) {
    set.add(DateUtils_firstDayOfWeekTimestamp(new Date().getTime(), startWeekFromMonday));
  }
  return CollectionUtils_sort(Array.from(set));
}

export function MonthCalendarSheet(): React.ReactElement {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params || {}) as { selectedFirstDayOfWeek?: number };
  const state = useStoreState();
  const settings = state.storage.settings;
  const history = state.storage.history;

  const prs = useMemo(() => History_getPersonalRecords(history), [history]);
  const firstDayOfWeeks = useMemo(
    () => getFirstDayOfWeeks(history, settings.startWeekFromMonday),
    [history, settings.startWeekFromMonday]
  );

  const selectedFirstDayOfWeek = params.selectedFirstDayOfWeek ?? firstDayOfWeeks[firstDayOfWeeks.length - 1];
  const selectedIndex = firstDayOfWeeks.findIndex((d) => d === selectedFirstDayOfWeek);

  const monthNames = settings.startWeekFromMonday
    ? ["M", "T", "W", "T", "F", "S", "S"]
    : ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <View className="flex-1 bg-background-default">
      <View className="px-3 pt-2">
        <LinkButton name="this-week" onPress={() => navigation.goBack()}>
          This week
        </LinkButton>
      </View>
      <View className="flex-row justify-around py-2 mx-3 border-b border-background-subtle">
        {monthNames.map((day, i) => (
          <View key={`${day}-${i}`} className="p-2 w-10 h-10 items-center justify-center">
            <Text className="text-gray-500 font-medium">{day}</Text>
          </View>
        ))}
      </View>
      <MonthCalendar
        visibleRecords={history.length}
        selectedFirstDayOfWeekIndex={selectedIndex >= 0 ? selectedIndex : firstDayOfWeeks.length - 1}
        startWeekFromMonday={settings.startWeekFromMonday}
        prs={prs}
        firstDayOfWeeks={firstDayOfWeeks}
        history={history}
        onClick={() => {
          navigation.goBack();
        }}
      />
    </View>
  );
}
