import "mocha";
import { expect } from "chai";
import { LiftographEngine_evaluateWidget } from "../src/liftograph/liftographEngine";
import { ILiftographWidget } from "../src/liftograph/liftographCompile";
import { LiftographSeriesEval_compile, LiftographSeriesEval_create } from "../src/liftograph/liftographSeriesEval";
import { LiftographValueView_format, LiftographValueView_path } from "../src/liftograph/liftographValueView";
import { IHistoryRecord } from "../src/types";
import { fxDay, fxEntry, fxRecord, fxSet, fxSettings, fxStats } from "./liftographFixtures";

const settings = fxSettings();
const today = fxDay(2026, 3, 31).getTime();

function viewOf(
  text: string,
  history: IHistoryRecord[],
  stats = fxStats()
): ReturnType<typeof LiftographValueView_format> {
  const evaluation = LiftographSeriesEval_create({ history, stats, settings, today });
  const widget: ILiftographWidget = LiftographSeriesEval_compile(evaluation, text).layout[0].items[0];
  const result = LiftographEngine_evaluateWidget(widget, evaluation);
  if (widget.kind !== "value" || result.type !== "value") {
    throw new Error("expected a value");
  }
  return LiftographValueView_format(widget, result, settings);
}

describe("LiftographValueView", () => {
  const squat = [
    fxRecord(fxDay(2026, 2, 20), [fxEntry("squat", [fxSet(200, 1)])]),
    fxRecord(fxDay(2026, 3, 28), [fxEntry("squat", [fxSet(215, 1)])]),
  ];

  it("shows the number, the unit and a good change for a lift going up", () => {
    const view = viewOf("value / name: Squat / source: exercise(Squat) / compare: 4w", squat);
    expect([view.number, view.unit, view.changeLabel]).to.eql(["215", "lb", "vs 4w"]);
    expect(view.change).to.eql({ direction: "up", tone: "good", text: "15 lb" });
  });

  it("keeps the change neutral for bodyweight", () => {
    const stats = fxStats([
      [fxDay(2026, 2, 20), 185],
      [fxDay(2026, 3, 28), 182],
    ]);
    const view = viewOf("value / source: stats(weight) / compare: 4w", [], stats);
    expect(view.change).to.eql({ direction: "down", tone: "neutral", text: "3 lb" });
  });

  it("shows a dash and no data yet when there are no points", () => {
    const view = viewOf("value / source: exercise(Squat) / compare: 4w", []);
    expect([view.number, view.changeLabel, view.change]).to.eql(["—", "no data yet", undefined]);
  });

  it("draws a trend path that breaks at missing days", () => {
    const path = LiftographValueView_path([{ x: 0, y: 1 }, undefined, { x: 0.5, y: 0 }, { x: 1, y: 0.5 }], 100, 20);
    expect(path).to.equal("M0.00 20.00M50.00 0.00L100.00 10.00");
  });
});
