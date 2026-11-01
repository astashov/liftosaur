import "mocha";
import { expect } from "chai";
import {
  ILiftographEngineResult,
  ILiftographSeriesResult,
  ILiftographWidgetResult,
  LiftographEngine_evaluate,
  LiftographEngine_evaluateWidget,
} from "../src/liftograph/liftographEngine";
import { ILiftographWidget } from "../src/liftograph/liftographCompile";
import { LiftographSeriesEval_compile, LiftographSeriesEval_create } from "../src/liftograph/liftographSeriesEval";
import { ILiftographSeriesPoints, ILiftographValueResult } from "../src/liftograph/liftographShape";
import { fxDay, fxEntry, fxRecord, fxSet, fxSettings, fxStats } from "./liftographFixtures";

const settings = fxSettings();

const history = [
  fxRecord(fxDay(2026, 3, 2), [
    fxEntry("squat", [fxSet(200, 5), fxSet(200, 5), fxSet(225, 1)]),
    fxEntry("benchPress", [fxSet(135, 5)]),
  ]),
  fxRecord(fxDay(2026, 3, 4), [fxEntry("squat", [fxSet(210, 5), fxSet(230, 1)])]),
  fxRecord(fxDay(2026, 3, 16), [fxEntry("squat", [fxSet(215, 5)])]),
];
const stats = fxStats([[fxDay(2026, 3, 1), 180]]);
const input = { history, stats, settings, today: fxDay(2026, 3, 18).getTime() };

function widgetAt(result: ILiftographEngineResult, row: number, item: number = 0): ILiftographWidgetResult {
  return result.layout[row].items[item];
}

function seriesOf(result: ILiftographWidgetResult): ILiftographSeriesResult[] {
  if (result.type !== "graph") {
    throw new Error(`expected a graph, got ${result.type}`);
  }
  return result.series;
}

function pointsOf(series: ILiftographSeriesResult): ILiftographSeriesPoints {
  if (series.status !== "ready") {
    throw new Error(`expected points, got: ${series.message}`);
  }
  return series.points;
}

function valueOf(result: ILiftographWidgetResult): ILiftographValueResult | undefined {
  if (result.type !== "value") {
    throw new Error(`expected a value, got ${result.type}`);
  }
  return result.value;
}

describe("LiftographEngine_evaluateWidget", () => {
  function graphWidget(text: string): {
    widget: ILiftographWidget;
    evaluation: ReturnType<typeof LiftographSeriesEval_create>;
  } {
    const evaluation = LiftographSeriesEval_create(input);
    return { widget: LiftographSeriesEval_compile(evaluation, text).layout[0].items[0], evaluation };
  }

  it("shapes a graph by the range override instead of the document's range", () => {
    const { widget, evaluation } = graphWidget("graph / range: 1w {\n  name: S / source: exercise(Squat)\n}");
    const inDocument = pointsOf(seriesOf(LiftographEngine_evaluateWidget(widget, evaluation))[0]);
    const overridden = pointsOf(seriesOf(LiftographEngine_evaluateWidget(widget, evaluation, "all"))[0]);
    expect([inDocument.points.length, overridden.points.length]).to.eql([1, 3]);
  });
});

describe("LiftographEngine_evaluate", () => {
  it("draws the cookbook rep-max chart", () => {
    const text = [
      "// ## Squat rep maxes, last 12 months",
      "graph / range: 1y {",
      "  name: Squat / source: exercise(Squat) / group: max {~",
      "    for (var.i in completedReps) { point(completedReps[var.i], completedWeights[var.i]) }",
      "  ~}",
      "}",
    ].join("\n");
    const result = LiftographEngine_evaluate(text, input);
    expect(result.diagnostics).to.deep.equal([]);
    expect(pointsOf(seriesOf(widgetAt(result, 0))[0])).to.deep.equal({
      xMode: "number",
      points: [
        { x: 1, y: 230 },
        { x: 5, y: 215 },
      ],
      x: { kind: "number" },
      y: { kind: "weight", unit: "lb" },
    });
  });

  it("computes a 'this week' row of values and keeps the row caption", () => {
    const text = [
      "// ## This week",
      "row {",
      "  value / name: Workouts / source: workout / smooth: count(7d) / compare: 1w",
      "  value / name: Bodyweight / source: stats(weight) / smooth: avg(7d)",
      "}",
    ].join("\n");
    const result = LiftographEngine_evaluate(text, input);
    expect(result.layout[0].caption).to.equal("## This week");
    expect(result.layout[0].items.map(valueOf)).to.deep.equal([
      { value: 1, compare: 1, axis: { kind: "number" } },
      { value: undefined, axis: { kind: "weight", unit: "lb" } },
    ]);
  });

  it("draws relative strength with a gap before the first weigh-in", () => {
    const early = fxRecord(fxDay(2026, 2, 20), [fxEntry("squat", [fxSet(190, 5)])]);
    const text = "graph {\n  name: Squat / source: exercise(Squat) {~ point(max(completedWeights) / bodyweight) ~}\n}";
    const result = LiftographEngine_evaluate(text, { ...input, history: [early, ...history] });
    const points = pointsOf(seriesOf(widgetAt(result, 0))[0]);
    expect(points.points.map((p) => Math.round(p.y * 100))).to.deep.equal([125, 128, 119]);
    expect(points.y).to.deep.equal({ kind: "number" });
  });

  it("shows an unsupported card for a newer widget and still draws the rest", () => {
    const result = LiftographEngine_evaluate(
      "table / source: workout\nvalue / source: workout / smooth: count(30d)",
      input
    );
    expect(result.layout.map((row) => row.items[0].widget.kind)).to.deep.equal(["unsupported", "value"]);
    expect(valueOf(widgetAt(result, 1))?.value).to.equal(3);
  });

  it("reports a runtime error at its place in the text and keeps the other series", () => {
    const text =
      'graph {\n  name: Bad / source: workout {~ point(isSetExercise(99, "Squat") ? 1 : 0) ~}\n  name: Good / source: workout\n}';
    const result = LiftographEngine_evaluate(text, input);
    const [bad, good] = seriesOf(widgetAt(result, 0));
    if (bad.status !== "error") {
      throw new Error("expected an error");
    }
    expect(bad.message).to.contain("Set 99 is out of range");
    expect(text.slice(bad.span.from, bad.span.to)).to.equal('isSetExercise(99, "Squat")');
    expect(result.diagnostics.map((d) => d.span)).to.deep.equal([bad.span]);
    expect(pointsOf(good).points.length).to.equal(3);
  });
});
