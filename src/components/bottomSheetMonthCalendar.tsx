import { JSX, useRef } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { MonthCalendar, IMonthCalendarRef } from "./monthCalendar";
import { LinkButton } from "./linkButton";
import { IHistoryRecord } from "../types";
import { IPersonalRecords } from "../models/history";
import { SheetDragHandle } from "../navigation/SheetScreenContainer";

export interface IBottomSheetMonthCalendarContentProps {
  firstDayOfWeeks: number[];
  history: IHistoryRecord[];
  startWeekFromMonday?: boolean;
  selectedFirstDayOfWeek: number;
  prs: IPersonalRecords;
  visibleRecords: number;
  onClick: (historyRecord: IHistoryRecord) => void;
}

export function BottomSheetMonthCalendarContent(props: IBottomSheetMonthCalendarContentProps): JSX.Element {
  const monthCalendarRef = useRef<IMonthCalendarRef>(null);
  const dayNames = props.startWeekFromMonday
    ? ["M", "T", "W", "T", "F", "S", "S"]
    : ["S", "M", "T", "W", "T", "F", "S"];
  const selectedIndex = props.firstDayOfWeeks.findIndex((date) => date === props.selectedFirstDayOfWeek);
  return (
    <>
      <SheetDragHandle>
        <View collapsable={false}>
          <View className="px-3 pt-4">
            <LinkButton name="this-week" onPress={() => monthCalendarRef.current?.scrollToSelected()}>
              This week
            </LinkButton>
          </View>
          <View className="flex-row justify-around py-2 mx-3 border-b border-background-subtle">
            {dayNames.map((day, i) => (
              <View key={i} className="items-center justify-center" style={{ width: 40, height: 40 }}>
                <Text className="font-medium text-text-secondary">{day}</Text>
              </View>
            ))}
          </View>
        </View>
      </SheetDragHandle>
      <MonthCalendar
        ref={monthCalendarRef}
        visibleRecords={props.visibleRecords}
        selectedFirstDayOfWeekIndex={selectedIndex}
        startWeekFromMonday={props.startWeekFromMonday}
        prs={props.prs}
        firstDayOfWeeks={props.firstDayOfWeeks}
        history={props.history}
        onClick={props.onClick}
      />
    </>
  );
}
