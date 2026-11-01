import "mocha";
import { expect } from "chai";
import { ILiftographWidgetResult, LiftographEngine_evaluateWidget } from "../src/liftograph/liftographEngine";
import { LiftographSeriesEval_compile, LiftographSeriesEval_create } from "../src/liftograph/liftographSeriesEval";
import {
  LiftographChartData_build,
  LiftographChartData_numericWindow,
  LiftographChartData_readout,
  LiftographChartData_toggleHidden,
  LiftographChartData_window,
} from "../src/liftograph/liftographChartData";
import { fxDay, fxEntry, fxRecord, fxSet, fxSettings, fxStats } from "./liftographFixtures";

const settings = fxSettings();
const today = fxDay(2026, 3, 31).getTime();
const history = [
  fxRecord(fxDay(2026, 3, 2), [fxEntry("squat", [fxSet(200, 5)])]),
  fxRecord(fxDay(2026, 3, 5), [fxEntry("squat", [fxSet(210, 5)])]),
];
const stats = fxStats([
  [fxDay(2026, 3, 3), 180],
  [fxDay(2026, 3, 6), 181],
]);

function graphOf(text: string): Extract<ILiftographWidgetResult, { type: "graph" }> {
  const evaluation = LiftographSeriesEval_create({ history, stats, settings, today });
  const widget = LiftographSeriesEval_compile(evaluation, text).layout[0].items[0];
  const result = LiftographEngine_evaluateWidget(widget, evaluation);
  if (result.type !== "graph") {
    throw new Error("expected a graph");
  }
  return result;
}

describe("LiftographChartData", () => {
  it("merges series on one x column in seconds, with alignment nulls", () => {
    const chart = LiftographChartData_build(
      graphOf("graph {\n  name: Squat / source: exercise(Squat)\n  name: BW / source: stats(weight) / axis: right\n}"),
      settings
    );
    expect(chart.xMode).to.equal("time");
    expect(chart.data[0]).to.eql(
      [fxDay(2026, 3, 2), fxDay(2026, 3, 3), fxDay(2026, 3, 5), fxDay(2026, 3, 6)].map((d) => d.getTime() / 1000)
    );
    expect(chart.data[1]).to.eql([200, null, 210, null]);
    expect(chart.data[2]).to.eql([null, 180, null, 181]);
    expect(chart.series.map((s) => [s.id, s.label, s.axis])).to.eql([
      [0, "Squat", "left"],
      [1, "BW", "right"],
    ]);
  });

  it("keeps every point at a repeated numeric x as its own row", () => {
    const sets = [fxRecord(fxDay(2026, 3, 2), [fxEntry("squat", [fxSet(200, 5), fxSet(190, 5)])])];
    const evaluation = LiftographSeriesEval_create({ history: sets, stats, settings, today });
    const text =
      "graph {\n  name: Sets / source: exercise(Squat) / mark: dots {~\n    for (var.i in completedReps) { point(completedReps[var.i], completedWeights[var.i]) }\n  ~}\n}";
    const widget = LiftographSeriesEval_compile(evaluation, text).layout[0].items[0];
    const result = LiftographEngine_evaluateWidget(widget, evaluation);
    if (result.type !== "graph") {
      throw new Error("expected a graph");
    }
    const chart = LiftographChartData_build(result, settings);
    expect(chart.xMode).to.equal("linear");
    expect(chart.data[0]).to.eql([5, 5]);
    expect(chart.data[1]?.slice().sort()).to.eql([190, 200]);
    expect(chart.series[0].mark).to.equal("dots");
    expect(LiftographChartData_numericWindow(chart)).to.eql({ xMin: 4.4, xMax: 5.6 });
  });

  it("reads the latest values without a cursor, and the cursor's row with one", () => {
    const chart = LiftographChartData_build(graphOf("graph {\n  name: Squat / source: exercise(Squat)\n}"), settings);
    expect(LiftographChartData_readout(chart, null)).to.deep.include({ label: "Latest" });
    expect(LiftographChartData_readout(chart, null).values.map((v) => v.value)).to.eql(["210 lb"]);
    expect(LiftographChartData_readout(chart, 0).values.map((v) => v.value)).to.eql(["200 lb"]);
  });

  it("opens a range window ending today, and no window for all", () => {
    expect(LiftographChartData_window("all", today)).to.eql({});
    const window = LiftographChartData_window({ n: 1, unit: "m" }, today);
    expect(window.xMax).to.equal(today / 1000);
    expect(window.xMin).to.equal(fxDay(2026, 2, 28).getTime() / 1000);
  });

  it("lists failed series as errors and charts the rest", () => {
    const chart = LiftographChartData_build(
      graphOf("graph {\n  name: Squat / source: exercise(Squat)\n  name: Bad / source: exercise(No Such Lift)\n}"),
      settings
    );
    expect(chart.series.map((s) => s.label)).to.eql(["Squat"]);
    expect(chart.errors.length).to.equal(1);
  });

  it("keeps each series' id when an earlier one fails, and leaves hidden series out of the readout", () => {
    const chart = LiftographChartData_build(
      graphOf(
        "graph {\n  name: Bad / source: exercise(No Such Lift)\n  name: Squat / source: exercise(Squat)\n  name: BW / source: stats(weight)\n}"
      ),
      settings
    );
    expect(chart.series.map((s) => [s.id, s.label])).to.eql([
      [1, "Squat"],
      [2, "BW"],
    ]);
    const hidden = LiftographChartData_toggleHidden([], 2);
    expect(LiftographChartData_readout(chart, null, hidden).values.map((v) => v.name)).to.eql(["Squat"]);
    expect(LiftographChartData_toggleHidden(hidden, 2)).to.eql([]);
  });
});
