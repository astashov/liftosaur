import "mocha";
import { expect } from "chai";
import { ILiftographWidget } from "../src/liftograph/liftographCompile";
import { LiftographSeriesEval_compile, LiftographSeriesEval_create } from "../src/liftograph/liftographSeriesEval";
import {
  ILiftographCalendarResult,
  LiftographCalendar_evaluate,
  LiftographCalendar_footer,
  LiftographCalendar_layout,
  LiftographCalendar_paths,
} from "../src/liftograph/liftographCalendar";
import { IHistoryRecord, ISettings } from "../src/types";
import { fxDay, fxRecord, fxSettings, fxStats } from "./liftographFixtures";

type ICalendarWidget = Extract<ILiftographWidget, { kind: "calendar" }>;

const WEDNESDAY = fxDay(2026, 3, 18).getTime();

function evaluate(
  text: string,
  history: IHistoryRecord[],
  settings: ISettings = fxSettings(),
  today: number = WEDNESDAY
): { widget: ICalendarWidget; result: ILiftographCalendarResult } {
  const evaluation = LiftographSeriesEval_create({ history, stats: fxStats(), settings, today });
  const widget = LiftographSeriesEval_compile(evaluation, text).layout[0].items[0];
  if (widget.kind !== "calendar") {
    throw new Error(`expected a calendar widget, got ${widget.kind}`);
  }
  return { widget, result: LiftographCalendar_evaluate(widget, evaluation) };
}

function workouts(...days: number[]): IHistoryRecord[] {
  return days.map((day) => fxRecord(fxDay(2026, 3, day), []));
}

describe("LiftographCalendar", () => {
  it("counts workouts per local day, and two on one day make one square", () => {
    const history = [...workouts(16, 16), fxRecord(fxDay(2026, 3, 16, 19), [])];
    const { result } = evaluate("calendar / range: 7d", history);
    expect(result.total).to.equal(3);
    expect(result.countByDay[fxDay(2026, 3, 16, 0).getTime()]).to.equal(3);
    const layout = LiftographCalendar_layout(result, 200);
    expect(layout.columns.flat().filter((cell) => cell.state === "done")).to.have.length(1);
  });

  it("blanks the days before the range and after today", () => {
    const { result } = evaluate("calendar / range: 7d", workouts(11, 12));
    expect(result.total).to.equal(1);
    const states = LiftographCalendar_layout(result, 200).columns.map((column) => column.map((cell) => cell.state));
    expect(states).to.deep.equal([
      ["outside", "outside", "outside", "outside", "done", "none", "none"],
      ["none", "none", "none", "none", "future", "future", "future"],
    ]);
  });

  it("starts columns on Monday when the user asks for it", () => {
    const settings: ISettings = { ...fxSettings(), startWeekFromMonday: true };
    const { result } = evaluate("calendar / range: 7d", [], settings);
    expect(new Date(result.weekStart).getDay()).to.equal(1);
    const states = LiftographCalendar_layout(result, 200).columns[0].map((cell) => cell.state);
    expect(states.slice(0, 3)).to.deep.equal(["outside", "outside", "outside"]);
  });

  it("counts the week streak back from this week, or from last week when this week is empty", () => {
    expect(evaluate("calendar", workouts(3, 10)).result.streakWeeks).to.equal(2);
    expect(evaluate("calendar", workouts(3, 10, 16)).result.streakWeeks).to.equal(3);
    expect(evaluate("calendar", workouts(3, 16)).result.streakWeeks).to.equal(1);
    expect(evaluate("calendar", workouts(1)).result.streakWeeks).to.equal(0);
  });

  it("squeezes every week into the width, capped at 22 points", () => {
    const { result } = evaluate("calendar / range: 7d", []);
    expect(LiftographCalendar_layout(result, 500).cell).to.equal(22);
    expect(LiftographCalendar_layout(result, 22).cell).to.be.closeTo(10, 1e-9);
    const year = evaluate("calendar / range: 1y", []).result;
    const layout = LiftographCalendar_layout(year, 150);
    expect(layout.width).to.be.closeTo(150, 1e-9);
    expect(layout.months.every((month, i) => i === 0 || month.column > layout.months[i - 1].column)).to.equal(true);
  });

  it("draws done squares, empty squares and the today outline as three paths", () => {
    const { result } = evaluate("calendar / range: 7d", workouts(16));
    const paths = LiftographCalendar_paths(LiftographCalendar_layout(result, 22));
    expect(paths.done.match(/M/g)).to.have.length(1);
    expect(paths.none.match(/M/g)).to.have.length(6);
    expect(paths.today).to.equal("M12 36h10v10h-10Z");
  });

  it("labels months from shown days only, never from future padding", () => {
    const march31 = fxDay(2026, 3, 31).getTime();
    const { result } = evaluate("calendar / range: 1d", workouts(31), fxSettings(), march31);
    expect(LiftographCalendar_layout(result, 200).months.map((m) => m.label)).to.deep.equal(["Mar"]);
  });

  it("writes the footer from the total and the range", () => {
    const { widget, result } = evaluate("calendar / range: 3m", workouts(16));
    expect(LiftographCalendar_footer(result, widget.range)).to.equal("1 workout in 3 months");
    const all = evaluate("calendar / range: all", workouts(1, 16));
    expect(LiftographCalendar_footer(all.result, all.widget.range)).to.equal("2 workouts in total");
  });
});
