import { JSX, h } from "preact";
import {
  DateUtils_formatYYYYMMDD,
  DateUtils_lastDayOfWeekTimestamp,
  DateUtils_firstDayOfWeekTimestamp,
} from "../utils/date";
import { IHistoryRecord } from "../types";
import { StringUtils_pluralize } from "../utils/string";
import { IPersonalRecords, History_getNumberOfPersonalRecords } from "../models/history";
import { CollectionUtils_compact } from "../utils/collection";
import { memo, useLayoutEffect, useRef } from "preact/compat";
import { ComparerUtils_noFns } from "../utils/comparer";
import { Tailwind } from "../utils/tailwindConfig";
import { Progress_isCurrent } from "../models/progress";

interface IMonthCalendarProps {
  firstDayOfWeeks: number[];
  selectedFirstDayOfWeekIndex: number;
  startWeekFromMonday?: boolean;
  visibleRecords: number;
  prs: IPersonalRecords;
  history: IHistoryRecord[];
  onClick: (historyRecord: IHistoryRecord) => void;
}

export const MonthCalendar = memo((props: IMonthCalendarProps): JSX.Element => {
  useLayoutEffect(() => {
    const selectedFirstDayOfWeekTs = props.firstDayOfWeeks[props.selectedFirstDayOfWeekIndex];
    if (selectedFirstDayOfWeekTs != null) {
      const selectedFirstDayOfWeek = new Date(selectedFirstDayOfWeekTs);
      const date = new Date(selectedFirstDayOfWeek.getFullYear(), selectedFirstDayOfWeek.getMonth(), 1);
      const yyyymmdd = DateUtils_formatYYYYMMDD(date);
      const element = document.getElementById(`month-calendar-${yyyymmdd}`);
      if (element) {
        element.scrollIntoView({ block: "center" });
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
  const scrollRef = useRef<HTMLDivElement>(null);
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
    acc[month][day] = acc[month][day] || [];
    acc[month][day].push(record);
    return acc;
  }, {});

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" ref={scrollRef}>
      <div class="p-3">
        {months.map((month) => {
          const year = month.getFullYear();
          const monthIndex = month.getMonth();
          const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
          let firstDayOfWeek = month.getDay();
          if (props.startWeekFromMonday) {
            firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
          }

          const days: number[] = Array.from({ length: daysInMonth }, (_, i) => i + 1);
          const dayToHistoryRecords = monthToHistoryRecords[DateUtils_formatYYYYMMDD(month)] || {};
          const historyRecords = CollectionUtils_compact(Object.values(dayToHistoryRecords).flat()).filter(
            (hr) => !Progress_isCurrent(hr)
          );
          const numberOfWorkouts = historyRecords.length;
          const numberOfPersonalRecords = History_getNumberOfPersonalRecords(historyRecords, props.prs);

          return (
            <div
              id={`month-calendar-${DateUtils_formatYYYYMMDD(month)}`}
              key={DateUtils_formatYYYYMMDD(month)}
              class="mb-8"
            >
              <h2 class="text-lg font-semibold">
                {month.toLocaleString("default", { month: "long", year: "numeric" })}
              </h2>
              <div className="text-sm">
                <span>
                  {numberOfWorkouts} {StringUtils_pluralize("workout", numberOfWorkouts)}
                </span>
                {" · "}
                <span>
                  🏆 {numberOfPersonalRecords} {StringUtils_pluralize("PR", numberOfPersonalRecords)}
                </span>
              </div>
              <div class="grid grid-cols-7 mt-2 text-center">
                {Array(firstDayOfWeek)
                  .fill(null)
                  .map((_, i) => (
                    <div key={`empty-${i}`} class="text-transparent">
                      .
                    </div>
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
                    <div
                      key={yyyymmdd}
                      data-first-day-of-week={thisFirstDayOfWeek}
                      class="flex items-center justify-center text-text-primary p-2"
                      style={{ background: isSelectedWeek ? Tailwind.semantic().background.subtle : "transparent" }}
                      onClick={() => {
                        if (historyRecord != null) {
                          props.onClick(historyRecord);
                        }
                      }}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isWorkout
                            ? "text-text-alwayswhite bg-background-error cursor-pointer"
                            : date > new Date()
                              ? "text-text-disabled"
                              : "text-text-primary cursor-pointer "
                        } ${yyyymmdd === today ? "border border-button-primarybackground font-bold" : ""}`}
                      >
                        {day}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}, ComparerUtils_noFns);
