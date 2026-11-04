import { DateUtils_firstDayOfWeekTimestamp } from "../utils/date";
import { ILiftographDuration, ILiftographWidget } from "./liftographCompile";
import { ILiftographSeriesEval, LiftographSeriesEval_rows } from "./liftographSeriesEval";
import { ILiftographWindow, LiftographShape_dayStart, LiftographShape_window } from "./liftographShape";

type ICalendarWidget = Extract<ILiftographWidget, { kind: "calendar" }>;

export interface ILiftographCalendarResult {
  window: ILiftographWindow;
  weekStart: number;
  countByDay: Partial<Record<number, number>>;
  total: number;
  streakWeeks: number;
}

export type ILiftographCalendarCellState = "done" | "none" | "outside" | "future";

export interface ILiftographCalendarCell {
  state: ILiftographCalendarCellState;
  isToday: boolean;
}

export interface ILiftographCalendarLayout {
  cell: number;
  gap: number;
  columns: ILiftographCalendarCell[][];
  months: { column: number; label: string }[];
  width: number;
  height: number;
}

const MAX_CELL = 22;
const GAP_RATIO = 0.2;
const MONTH_LABEL_WIDTH = 28;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const UNIT_NAMES: Record<Exclude<ILiftographDuration, "all">["unit"], string> = {
  d: "day",
  w: "week",
  m: "month",
  y: "year",
};

function addDays(ts: number, days: number): number {
  const date = new Date(ts);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days).getTime();
}

function streakWeeks(weeks: Set<number>, today: number, startWeekFromMonday: boolean | undefined): number {
  let week = DateUtils_firstDayOfWeekTimestamp(today, startWeekFromMonday);
  if (!weeks.has(week)) {
    week = addDays(week, -7);
  }
  let count = 0;
  while (weeks.has(week)) {
    count += 1;
    week = addDays(week, -7);
  }
  return count;
}

export function LiftographCalendar_evaluate(
  widget: ICalendarWidget,
  evaluation: ILiftographSeriesEval
): ILiftographCalendarResult {
  const { settings, today } = evaluation.input;
  const rows = LiftographSeriesEval_rows(evaluation, { type: "workout" });
  const window = LiftographShape_window(today, widget.range, rows[0]?.ts);
  const countByDay: Partial<Record<number, number>> = {};
  const weeks = new Set<number>();
  let total = 0;
  for (const row of rows) {
    if (row.ts > window.to) {
      continue;
    }
    weeks.add(DateUtils_firstDayOfWeekTimestamp(row.ts, settings.startWeekFromMonday));
    if (row.ts >= window.from) {
      const day = LiftographShape_dayStart(row.ts);
      countByDay[day] = (countByDay[day] ?? 0) + 1;
      total += 1;
    }
  }
  return {
    window,
    weekStart: DateUtils_firstDayOfWeekTimestamp(window.from, settings.startWeekFromMonday),
    countByDay,
    total,
    streakWeeks: streakWeeks(weeks, today, settings.startWeekFromMonday),
  };
}

function cellState(result: ILiftographCalendarResult, day: number, today: number): ILiftographCalendarCellState {
  if (day < result.window.from) {
    return "outside";
  } else if (day > today) {
    return "future";
  }
  return (result.countByDay[day] ?? 0) > 0 ? "done" : "none";
}

export function LiftographCalendar_layout(result: ILiftographCalendarResult, width: number): ILiftographCalendarLayout {
  const today = LiftographShape_dayStart(result.window.to);
  const columns: ILiftographCalendarCell[][] = [];
  const monthByColumn: (number | undefined)[] = [];
  for (let weekStart = result.weekStart; weekStart <= today; weekStart = addDays(weekStart, 7)) {
    const column: ILiftographCalendarCell[] = [];
    let month: number | undefined;
    for (let i = 0; i < 7; i += 1) {
      const day = addDays(weekStart, i);
      const state = cellState(result, day, today);
      column.push({ state, isToday: day === today });
      const isFirstShown = columns.length === 0 && day === result.window.from;
      if (state !== "outside" && state !== "future" && (isFirstShown || new Date(day).getDate() === 1)) {
        month = new Date(day).getMonth();
      }
    }
    columns.push(column);
    monthByColumn.push(month);
  }
  const count = Math.max(1, columns.length);
  const cell = Math.min(MAX_CELL, Math.max(0, width) / (count + (count - 1) * GAP_RATIO));
  const gap = cell * GAP_RATIO;
  const months: { column: number; label: string }[] = [];
  let lastX = -Infinity;
  monthByColumn.forEach((month, column) => {
    const x = column * (cell + gap);
    if (month != null && x - lastX >= MONTH_LABEL_WIDTH) {
      months.push({ column, label: MONTHS[month] });
      lastX = x;
    }
  });
  return {
    cell,
    gap,
    columns,
    months,
    width: count * cell + (count - 1) * gap,
    height: 7 * cell + 6 * gap,
  };
}

function square(x: number, y: number, size: number): string {
  return `M${x} ${y}h${size}v${size}h${-size}Z`;
}

export function LiftographCalendar_paths(layout: ILiftographCalendarLayout): {
  done: string;
  none: string;
  today?: string;
} {
  const step = layout.cell + layout.gap;
  let done = "";
  let none = "";
  let today: string | undefined;
  layout.columns.forEach((column, x) => {
    column.forEach((cell, y) => {
      const path = square(x * step, y * step, layout.cell);
      if (cell.state === "done") {
        done += path;
      } else if (cell.state === "none") {
        none += path;
      }
      if (cell.isToday) {
        today = path;
      }
    });
  });
  return { done, none, today };
}

export function LiftographCalendar_footer(result: ILiftographCalendarResult, range: ILiftographDuration): string {
  const workouts = `${result.total} ${result.total === 1 ? "workout" : "workouts"}`;
  if (range === "all") {
    return `${workouts} in total`;
  }
  const unit = UNIT_NAMES[range.unit];
  return `${workouts} in ${range.n === 1 ? `1 ${unit}` : `${range.n} ${unit}s`}`;
}
