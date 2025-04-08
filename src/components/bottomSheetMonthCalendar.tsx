import { h, JSX, Fragment } from "preact";
import { BottomSheet } from "./bottomSheet";
import { memo } from "preact/compat";
import { ComparerUtils } from "../utils/comparer";
import { MonthCalendar } from "./monthCalendar";
import { LinkButton } from "./linkButton";
import { IHistoryRecord } from "../types";
import { IPersonalRecords } from "../models/history";

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

export const BottomSheetMonthCalendar = memo((props: IProps): JSX.Element => {
  const monthNames = props.startWeekFromMonday
    ? ["M", "T", "W", "T", "F", "S", "S"]
    : ["S", "M", "T", "W", "T", "F", "S"];
  const selectedIndex = props.firstDayOfWeeks.findIndex((date) => date === props.selectedFirstDayOfWeek);
  return (
    <>
      <BottomSheet shouldShowClose={true} onClose={props.onClose} isHidden={props.isHidden}>
        <div className="px-3">
          <LinkButton
            name="this-week"
            onClick={() => {
              const element = document.querySelector(`[data-first-day-of-week='${props.selectedFirstDayOfWeek}']`);
              if (element) {
                element.scrollIntoView({ block: "center", behavior: "smooth" });
              }
            }}
          >
            This week
          </LinkButton>
        </div>
        <div className="flex flex-row justify-around py-2 mx-3 border-b border-grayv3-100">
          {monthNames.map((day) => (
            <div key={day} class="text-gray-500 font-medium p-2 w-10 h-10 text-center">
              {day}
            </div>
          ))}
        </div>
        <div className="relative flex flex-col flex-1 min-h-0">
          <MonthCalendar
            visibleRecords={props.visibleRecords}
            selectedFirstDayOfWeekIndex={selectedIndex}
            startWeekFromMonday={props.startWeekFromMonday}
            prs={props.prs}
            firstDayOfWeeks={props.firstDayOfWeeks}
            history={props.history}
            onClick={props.onClick}
          />
        </div>
      </BottomSheet>
    </>
  );
}, ComparerUtils.noFns);
