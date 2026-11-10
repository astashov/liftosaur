import "mocha";
import { expect } from "chai";
import { DashboardPreview_summarize, IDashboardPreview, IDashboardPreviewWidget } from "../src/models/dashboardPreview";
import { LiftographEngine_evaluate } from "../src/liftograph/liftographEngine";
import { fxDay, fxEntry, fxRecord, fxSet, fxSettings, fxStats } from "./liftographFixtures";

const settings = fxSettings();
const today = fxDay(2026, 3, 31).getTime();
const history = [
  fxRecord(fxDay(2026, 3, 2), [
    fxEntry("squat", [fxSet(200, 5), fxSet(210, 3)]),
    fxEntry("benchPress", [fxSet(135, 5)]),
  ]),
  fxRecord(fxDay(2026, 3, 16), [fxEntry("squat", [fxSet(220, 5)])]),
  fxRecord(fxDay(2026, 3, 30), [fxEntry("squat", [fxSet(230, 5)])]),
];
const stats = fxStats([
  [fxDay(2026, 3, 1), 180],
  [fxDay(2026, 3, 29), 178],
]);

function preview(text: string): IDashboardPreview {
  const result = LiftographEngine_evaluate(text, { history, stats, settings, today });
  return DashboardPreview_summarize(text, result, settings, today);
}

function only(text: string): IDashboardPreviewWidget {
  const widgets = preview(text).widgets;
  expect(widgets).to.have.length(1);
  return widgets[0];
}

describe("DashboardPreview", () => {
  it("summarizes a time graph with point counts and first and last dates", () => {
    const widget = only(
      "graph {\n  name: Squat / source: exercise(Squat)\n  name: Bench / source: exercise(Bench Press)\n}"
    );
    expect(widget).to.deep.include({ kind: "graph", xMode: "time", row: 1 });
    expect(widget.kind === "graph" && widget.series).to.deep.equal([
      {
        name: "Squat",
        status: "ready",
        pointCount: 3,
        unit: "lb",
        first: { x: "2026-03-02", y: 210 },
        last: { x: "2026-03-30", y: 230 },
      },
      {
        name: "Bench",
        status: "ready",
        pointCount: 1,
        unit: "lb",
        first: { x: "2026-03-02", y: 135 },
        last: { x: "2026-03-02", y: 135 },
      },
    ]);
  });

  it("keeps numbers on a numeric x-axis", () => {
    const widget = only(
      "graph {\n  name: Reps / source: exercise(Squat) / group: max {~\n    for (var.i in completedReps) { point(completedReps[var.i], completedWeights[var.i]) }\n  ~}\n}"
    );
    expect(widget.kind === "graph" && [widget.xMode, widget.series[0]]).to.deep.equal([
      "number",
      { name: "Reps", status: "ready", pointCount: 2, unit: "lb", first: { x: 3, y: 210 }, last: { x: 5, y: 230 } },
    ]);
  });

  it("reports a value, its delta, and an empty value", () => {
    expect(only("value / source: stats(weight) / compare: 4w")).to.deep.include({
      kind: "value",
      value: 178,
      delta: -2,
      isEmpty: false,
    });
    expect(only("value / source: stats(waist)")).to.deep.include({ kind: "value", isEmpty: true, value: undefined });
  });

  it("limits muscle groups to the ones the widget lists, in sets per week", () => {
    const widget = only("muscles / range: 4w / show: sets(quadriceps, chest)");
    expect(widget.kind === "muscles" && widget.groups.map((g) => [g.key, g.name])).to.deep.equal([
      ["quadriceps", "Quads"],
      ["chest", "Chest"],
    ]);
    expect(widget).to.deep.include({ unit: "sets/week", truncated: false });
  });

  it("caps the muscle list and marks it truncated", () => {
    const widget = only("muscles / range: 4w");
    expect(widget.kind === "muscles" && [widget.groups.length, widget.truncated]).to.deep.equal([12, true]);
  });

  it("reports the calendar window, total and streak", () => {
    const widget = only("calendar / range: 1m");
    expect(widget).to.deep.include({ kind: "calendar", total: 3 });
    expect(widget.kind === "calendar" && widget.window.to).to.equal("2026-03-31");
  });

  it("names text, unsupported and error widgets, and lists compile errors", () => {
    const result = preview(
      "// **Hello**\n\ngauge / source: workout\n\ngraph {\n  name: X / source: exercise(Nope Lift)\n}"
    );
    expect(result.widgets.map((w) => w.kind)).to.deep.equal(["text", "unsupported", "graph"]);
    expect(result.errors.map((e) => e.message)).to.include("Unknown exercise 'Nope Lift'");
    const graph = result.widgets[2];
    expect(graph.kind === "graph" && [graph.xMode, graph.series[0].status]).to.deep.equal(["unknown", "error"]);
    expect(result.widgets[0]).to.deep.include({ kind: "text", markdown: "**Hello**" });
  });

  it("takes xMode from the compiled series when every series fails at runtime", () => {
    const widget = only(
      'graph {\n  name: Odd / source: workout {~ if (isSetExercise(99, "Squat")) { point(1, 1) } ~}\n}'
    );
    expect(widget.kind === "graph" && [widget.xMode, widget.series[0].status]).to.deep.equal(["number", "error"]);
  });

  it("names each value and keeps the row caption", () => {
    const result = preview(
      "// ## This week\nrow {\n  value / name: Squat / source: exercise(Squat) / y: e1rm\n  value / name: Bench / source: exercise(Bench Press) / y: e1rm\n}"
    );
    expect(result.widgets.map((w) => [w.rowCaption, w.kind === "value" ? w.name : undefined])).to.deep.equal([
      ["## This week", "Squat"],
      ["## This week", "Bench"],
    ]);
  });
});
