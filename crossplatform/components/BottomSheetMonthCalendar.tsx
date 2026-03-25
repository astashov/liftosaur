import { memo } from "react";
import type { JSX } from "react";
import { View, Text } from "react-native";
import { BottomSheet } from "./BottomSheet";
import { MonthCalendar } from "./MonthCalendar";
import { LinkButton } from "./LinkButton";
import type { IHistoryRecord } from "@shared/types";
import type { IPersonalRecords } from "@shared/models/history";

interface IProps {
  firstDayOfWeeks: number[];
  history: IHistoryRecord[];
  startWeekFromMonday?: boolean;
  selectedFirstDayOfWeek: number;
  prs: IPersonalRecords;
  isHidden: boolean;
  visibleRecords: number;
  onClick: (historyRecord: IHistoryRecord) => void;
  onClose: () => void;
}

export const BottomSheetMonthCalendar = memo((props: IProps): JSX.Element | null => {
  const monthNames = props.startWeekFromMonday
    ? ["M", "T", "W", "T", "F", "S", "S"]
    : ["S", "M", "T", "W", "T", "F", "S"];
  const selectedIndex = props.firstDayOfWeeks.findIndex((date) => date === props.selectedFirstDayOfWeek);

  return (
    <BottomSheet shouldShowClose={true} onClose={props.onClose} isHidden={props.isHidden}>
      <View className="px-3">
        <LinkButton name="this-week" onPress={props.onClose}>
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
        visibleRecords={props.visibleRecords}
        selectedFirstDayOfWeekIndex={selectedIndex}
        startWeekFromMonday={props.startWeekFromMonday}
        prs={props.prs}
        firstDayOfWeeks={props.firstDayOfWeeks}
        history={props.history}
        onClick={props.onClick}
      />
    </BottomSheet>
  );
});
