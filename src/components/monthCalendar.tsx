import { JSX, h } from "preact";
import { DateUtils } from "../utils/date";
import { IHistoryRecord } from "../types";
import { StringUtils } from "../utils/string";
import { IPersonalRecords, History } from "../models/history";
import { CollectionUtils } from "../utils/collection";
import { memo, useLayoutEffect, useRef } from "preact/compat";
import { ComparerUtils } from "../utils/comparer";

interface IMonthCalendarProps {
  weeks: Date[];
  selectedWeek: number;
  startWeekFromMonday?: boolean;
  prs: IPersonalRecords;
  history: IHistoryRecord[];
  onClick: (day: Date) => void;
}

export const MonthCalendar = memo((props: IMonthCalendarProps): JSX.Element => {
  useLayoutEffect(() => {
    const selectedWeek = props.weeks[props.selectedWeek];
    if (selectedWeek) {
      const date = new Date(selectedWeek.getFullYear(), selectedWeek.getMonth(), 1);
      const yyyymmdd = DateUtils.formatYYYYMMDD(date);
      const element = document.getElementById(`month-calendar-${yyyymmdd}`);
      if (element) {
        element.scrollIntoView({ block: "center" });
      }
    }
  }, [props.weeks, props.selectedWeek]);

  const start = new Date(props.weeks[0]);
  start.setDate(1);
  const end = new Date(props.weeks[props.weeks.length - 1]);
  end.setDate(1);
  const months: Date[] = [];
  const current = new Date(start);
  const scrollRef = useRef<HTMLDivElement>(null);
  while (current <= end) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }
  const today = DateUtils.formatYYYYMMDD(new Date());
  const monthToHistoryRecords = props.history.reduce<
    Partial<Record<string, Partial<Record<string, IHistoryRecord[]>>>>
  >((acc, record) => {
    const d = new Date(Date.parse(record.date));
    d.setDate(1);
    const month = DateUtils.formatYYYYMMDD(d);
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
          const dayToHistoryRecords = monthToHistoryRecords[DateUtils.formatYYYYMMDD(month)] || {};
          const historyRecords = CollectionUtils.compact(Object.values(dayToHistoryRecords).flat());
          const numberOfWorkouts = historyRecords.length;
          const numberOfPersonalRecords = History.getNumberOfPersonalRecords(historyRecords, props.prs);

          return (
            <div
              id={`month-calendar-${DateUtils.formatYYYYMMDD(month)}`}
              key={DateUtils.formatYYYYMMDD(month)}
              class="mb-8"
            >
              <h2 class="text-lg font-semibold">
                {month.toLocaleString("default", { month: "long", year: "numeric" })}
              </h2>
              <div className="text-sm">
                <span>
                  {numberOfWorkouts} {StringUtils.pluralize("workout", numberOfWorkouts)}
                </span>
                {" · "}
                <span>
                  🏆 {numberOfPersonalRecords} {StringUtils.pluralize("PR", numberOfPersonalRecords)}
                </span>
              </div>
              <div class="grid grid-cols-7 gap-2 mt-2 text-center">
                {Array(firstDayOfWeek)
                  .fill(null)
                  .map((_, i) => (
                    <div key={`empty-${i}`} class="text-transparent">
                      .
                    </div>
                  ))}
                {days.map((day) => {
                  const date = new Date(year, monthIndex, day);
                  const yyyymmdd = DateUtils.formatYYYYMMDD(date);
                  const isWorkout = (dayToHistoryRecords[day]?.length || 0) > 0;
                  return (
                    <div
                      key={yyyymmdd}
                      class="flex items-center justify-center text-gray-800"
                      onClick={() => {
                        props.onClick(new Date(year, monthIndex, day));
                      }}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isWorkout
                            ? "text-white bg-redv3-500 cursor-pointer"
                            : date > new Date()
                              ? "text-grayv3-400"
                              : "text-blackv2 cursor-pointer "
                        } ${yyyymmdd === today ? "border border-purplev3-500 font-bold" : ""}`}
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
}, ComparerUtils.noFns);
