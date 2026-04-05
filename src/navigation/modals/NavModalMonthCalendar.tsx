import { JSX, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { BottomSheetMonthCalendarContent } from "../../components/bottomSheetMonthCalendar";
import { History_getPersonalRecords } from "../../models/history";
import { CollectionUtils_sort } from "../../utils/collection";
import { IState, updateState } from "../../models/state";
import { lb } from "lens-shmens";
import { DateUtils_firstDayOfWeekTimestamp } from "../../utils/date";
import { Progress_isCurrent } from "../../models/progress";

export function NavModalMonthCalendar(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();

  const sortedHistory = useMemo(
    () =>
      CollectionUtils_sort(state.storage.history, (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [state.storage.history]
  );
  const prs = History_getPersonalRecords(sortedHistory);

  const startWeekFromMonday = state.storage.settings.startWeekFromMonday;
  const firstDayOfWeeks = useMemo(() => {
    const set = new Set<number>();
    for (const record of sortedHistory) {
      if (!Progress_isCurrent(record)) {
        set.add(DateUtils_firstDayOfWeekTimestamp(record.endTime ?? record.startTime, startWeekFromMonday));
      }
    }
    if (set.size === 0) {
      set.add(DateUtils_firstDayOfWeekTimestamp(Date.now(), startWeekFromMonday));
    }
    return CollectionUtils_sort(Array.from(set));
  }, [sortedHistory, startWeekFromMonday]);

  const selectedFirstDayOfWeek = firstDayOfWeeks[firstDayOfWeeks.length - 1];

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <BottomSheetMonthCalendarContent
        prs={prs}
        firstDayOfWeeks={firstDayOfWeeks}
        history={sortedHistory}
        startWeekFromMonday={startWeekFromMonday}
        selectedFirstDayOfWeek={selectedFirstDayOfWeek}
        visibleRecords={sortedHistory.length}
        onClick={(historyRecord) => {
          updateState(
            dispatch,
            [lb<IState>().p("scrollToHistoryRecordId").record(historyRecord.id)],
            "Scroll to history record from calendar"
          );
          onClose();
        }}
      />
    </SheetScreenContainer>
  );
}
