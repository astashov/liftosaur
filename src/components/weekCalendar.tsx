import { JSX, h } from "preact";
import { useRef, useCallback, useEffect } from "preact/hooks";
import { IHistoryRecord } from "../types";
import { DateUtils } from "../utils/date";
import { History } from "../models/history";
import { IconArrowRight } from "./icons/iconArrowRight";
import { IconSpinner } from "./icons/iconSpinner";

interface IWeekCalendarProps {
  weeks: Date[];
  selectedWeek: number;
  forceToggle: boolean;
  isLoading: boolean;
  onSelectWeek: (week: number) => void;
  onClick: () => void;
  history: IHistoryRecord[];
}

export function WeekCalendar(props: IWeekCalendarProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dateToHistory = History.getDateToHistory(props.history);

  const handleScroll = useCallback(() => {
    const scrollLeft = scrollRef.current?.scrollLeft ?? 0;
    const width = scrollRef.current?.clientWidth;
    const selectedWeek = Math.floor((scrollLeft + width / 2) / width);
    props.onSelectWeek(selectedWeek);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: props.selectedWeek * scrollRef.current?.clientWidth || 0,
        behavior: "instant",
      });
    }
  }, [props.forceToggle]);

  return (
    <div className="relative flex items-center justify-center w-full bg-white">
      {props.isLoading ? (
        <div className="absolute" style={{ left: 8, top: 28 }}>
          <IconSpinner width={12} height={12} />
        </div>
      ) : null}
      {props.selectedWeek > 0 && (
        <div className="absolute top-0 left-0">
          <button
            className="p-3"
            onClick={() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTo({
                  left: (props.selectedWeek - 1) * (scrollRef.current?.clientWidth || 0),
                  behavior: "smooth",
                });
              }
            }}
          >
            <IconArrowRight className="rotate-180" width={5} height={9} />
          </button>
        </div>
      )}
      {props.selectedWeek < props.weeks.length - 1 && (
        <div className="absolute top-0 right-0">
          <button
            className="p-2"
            onClick={() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTo({
                  left: (props.selectedWeek + 1) * (scrollRef.current?.clientWidth || 0),
                  behavior: "smooth",
                });
              }
            }}
          >
            <IconArrowRight width={5} height={9} />
          </button>
        </div>
      )}
      <div
        ref={scrollRef}
        className="flex w-full py-2 mx-4 overflow-x-auto will-change-transform"
        style={{
          perspective: "1px",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x mandatory",
        }}
        onScroll={handleScroll}
        onClick={props.onClick}
      >
        {props.weeks.map((weekStart, index) => (
          <div
            key={index}
            className="flex-none w-full gap-3"
            style={{ scrollSnapAlign: "center", scrollSnapStop: "always" }}
          >
            <div className="flex flex-row justify-around w-full">
              {getWeekDays(weekStart, dateToHistory).map((day, idx) => {
                return (
                  <div key={day.dayName} className="flex flex-col items-center justify-center rounded-full">
                    <div className="text-xs text-gray-500">{day.dayName}</div>
                    <div
                      className={`flex items-center justify-center text-sm w-8 h-8 rounded-full ${
                        day.record ? "text-white bg-redv3-500" : "text-gray-800"
                      } ${day.isToday ? "border border-purplev3-500 font-bold" : ""}`}
                    >
                      {day.dayNumber}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface IWeekDay {
  record?: IHistoryRecord;
  date: Date;
  isToday: boolean;
  dayNumber: number;
  dayName: string;
}

const getWeekDays = (startDate: Date, dateToHistory: Partial<Record<string, IHistoryRecord>>): IWeekDay[] => {
  const days = [];
  const dayNames = ["M", "T", "W", "T", "F", "S", "S"];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const formatted = DateUtils.formatYYYYMMDD(date);
    days.push({
      record: dateToHistory[formatted],
      date,
      isToday: DateUtils.formatYYYYMMDD(date) === DateUtils.formatYYYYMMDD(new Date()),
      dayNumber: date.getDate(),
      dayName: dayNames[i],
    });
  }
  return days;
};
