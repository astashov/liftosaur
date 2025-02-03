import { h, JSX, Fragment } from "preact";
import { BottomSheet } from "./bottomSheet";
import { memo } from "preact/compat";
import { ComparerUtils } from "../utils/comparer";
import { MonthCalendar } from "./monthCalendar";
import { LinkButton } from "./linkButton";
import { IHistoryRecord } from "../types";
import { IPersonalRecords } from "../models/history";

interface IProps {
  weeks: Date[];
  history: IHistoryRecord[];
  selectedWeek: number;
  prs: IPersonalRecords;
  isHidden: boolean;
  onClick: (day: Date) => void;
  onClose: () => void;
}

export const BottomSheetMonthCalendar = memo((props: IProps): JSX.Element => {
  return (
    <>
      <BottomSheet shouldShowClose={true} onClose={props.onClose} isHidden={props.isHidden}>
        <div className="px-3">
          <LinkButton name="this-week" onClick={() => props.onClick(new Date())}>
            This week
          </LinkButton>
        </div>
        <div className="flex flex-row justify-around py-2 mx-3 border-b border-grayv3-100">
          {["M", "T", "W", "T", "F", "S", "S"].map((day) => (
            <div key={day} class="text-gray-500 font-medium p-2 w-10 h-10 text-center">
              {day}
            </div>
          ))}
        </div>
        <div className="relative flex flex-col flex-1 min-h-0">
          <MonthCalendar
            selectedWeek={props.selectedWeek}
            prs={props.prs}
            weeks={props.weeks}
            history={props.history}
            onClick={props.onClick}
          />
        </div>
      </BottomSheet>
    </>
  );
}, ComparerUtils.noFns);
