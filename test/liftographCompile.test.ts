import "mocha";
import { expect } from "chai";
import {
  ILiftographCompiledSeries,
  ILiftographSeriesSpec,
  LiftographCompile_document,
} from "../src/liftograph/liftographCompile";
import { LiftographDocument_parse } from "../src/liftograph/liftographDocument";
import { fxSettings } from "./liftographFixtures";

const settings = fxSettings();

function compile(text: string): ReturnType<typeof LiftographCompile_document> {
  return LiftographCompile_document(LiftographDocument_parse(text), settings);
}

function graphSeries(text: string): ILiftographCompiledSeries[] {
  const widget = compile(text).layout[0].items[0];
  if (widget.kind !== "graph") {
    throw new Error(`expected a graph, got ${widget.kind}`);
  }
  return widget.series;
}

function ready(series: ILiftographCompiledSeries): ILiftographSeriesSpec {
  if (series.status !== "ready") {
    throw new Error(`expected a ready series, got: ${series.message}`);
  }
  return series.spec;
}

function messages(text: string): string[] {
  return compile(text).diagnostics.map((d) => d.message);
}

describe("LiftographCompile_document", () => {
  it("compiles sources, presets and shaping keys", () => {
    const { layout, diagnostics } = compile(
      "graph / range: 1y {\n  name: Squat / source: exercise(Squat, label: T1) / y: e1rm / group: max(1w) / smooth: avg(4w) / mark: bars / axis: right\n}"
    );
    expect(diagnostics).to.deep.equal([]);
    const graph = layout[0].items[0];
    if (graph.kind !== "graph") {
      throw new Error("expected a graph");
    }
    expect(graph.range).to.deep.equal({ n: 1, unit: "y" });
    const series = ready(graph.series[0]);
    expect(series.source).to.deep.equal({
      type: "exercise",
      exerciseId: "squat",
      equipment: "barbell",
      label: "T1",
      program: undefined,
      day: undefined,
    });
    expect(series.values).to.deep.equal({ type: "preset", preset: "e1rm", arg: undefined });
    expect(series.group).to.deep.equal({ agg: "max", duration: { n: 1, unit: "w" } });
    expect(series.smooth).to.deep.equal({ agg: "avg", window: { n: 4, unit: "w" } });
    expect([series.mark, series.axis]).to.deep.equal(["bars", "right"]);
  });

  it("uses each source's default values", () => {
    const series = graphSeries(
      "graph {\n  name: A / source: exercise(Squat)\n  name: B / source: workout\n  name: C / source: stats(weight)\n}"
    ).map(ready);
    expect(series.map((s) => (s.values.type === "preset" ? s.values.preset : s.values.script.text))).to.deep.equal([
      "maxWeight",
      "volume",
      "value",
    ]);
  });

  it("keeps the valid series of a graph when one series is invalid", () => {
    const series = graphSeries(
      "graph {\n  name: Gone / source: exercise(Deleted Custom Lift)\n  name: Squat / source: exercise(Squat)\n}"
    );
    expect(series.map((s) => s.status)).to.deep.equal(["invalid", "ready"]);
    expect(series[0].status === "invalid" ? [series[0].name, series[0].message] : []).to.deep.equal([
      "Gone",
      "Unknown exercise 'Deleted Custom Lift'",
    ]);
  });

  it("treats arguments it doesn't know as a newer feature", () => {
    const kinds = compile(
      "value / source: stats(weight, futureFilter: yes)\nvalue / source: exercise(Squat) / y: e1rm(5)"
    ).layout.map((row) => row.items[0].kind);
    expect(kinds).to.deep.equal(["unsupported", "unsupported"]);
  });

  it("checks muscle group names written in scripts", () => {
    const text = 'value / source: workout {~ point(muscleSets("chestt")) ~}';
    const [diagnostic] = compile(text).diagnostics;
    expect(diagnostic.message).to.equal('Unknown muscle group "chestt"');
    expect(text.slice(diagnostic.span.from, diagnostic.span.to)).to.equal('"chestt"');
  });

  it("turns unknown kinds, keys, sources and presets into an unsupported widget with no error", () => {
    const { layout, diagnostics } = compile(
      "table / source: workout\nvalue / source: workout / color2: red\nvalue / source: health(sleep)\nvalue / source: workout / y: readiness"
    );
    expect(diagnostics).to.deep.equal([]);
    expect(layout.map((row) => row.items[0].kind)).to.deep.equal([
      "unsupported",
      "unsupported",
      "unsupported",
      "unsupported",
    ]);
  });

  it("reports wrong combinations on their line", () => {
    expect(messages("value / source: stats(weight) / y: e1rm")).to.deep.equal([
      "'e1rm' doesn't work with a stats source",
    ]);
    expect(messages("value / source: exercise(Squat) / group: max")).to.deep.equal([
      "'group:' needs a duration here, like max(1w)",
    ]);
    expect(messages("value / source: exercise(Squat) {~ point(reps[1], 1) ~}")).to.deep.equal([
      "A value takes point(y) only",
    ]);
    expect(messages("value / source: exercise(Nonexistent Lift)")).to.deep.equal([
      "Unknown exercise 'Nonexistent Lift'",
    ]);
    expect(messages("value / source: workout / y: muscleSets(chestt)")).to.deep.equal([
      "Unknown muscle group 'chestt'",
    ]);
    expect(messages("muscles / range: 3d")).to.deep.equal(["The muscles range is at least 7d"]);
  });

  it("limits trends to a year and other durations to ten years", () => {
    expect(messages("value / source: workout / trend: 1y")).to.deep.equal([]);
    expect(messages("value / source: workout / trend: 2y")).to.deep.equal(["This duration can be at most 1y"]);
    expect(messages("value / source: workout / trend: all")).to.deep.equal(["This duration can be at most 1y"]);
    expect(messages("graph / range: 11y {\n  source: workout\n}")).to.deep.equal(["This duration can be at most 10y"]);
    expect(messages("graph / range: all {\n  source: workout\n}")).to.deep.equal([]);
    expect(messages("value / source: workout / smooth: avg(11y)")).to.deep.equal(["This duration can be at most 10y"]);
  });

  it("rejects mixed point() arity and mixed x modes", () => {
    expect(messages("graph {\n  name: A / source: exercise {~ point(1)\n point(1, 2) ~}\n}")).to.deep.equal([
      "All point() calls in one series must take the same number of arguments",
    ]);
    expect(
      messages(
        "graph {\n  name: A / source: exercise {~ point(1) ~}\n  name: B / source: exercise {~ point(1, 2) ~}\n}"
      )
    ).to.deep.equal(["All series in one graph must use the same x-axis"]);
  });

  it("places script errors inside the document text", () => {
    const text = "value / source: workout {~ point(bogus) ~}";
    const [diagnostic] = compile(text).diagnostics;
    expect(text.slice(diagnostic.span.from, diagnostic.span.to)).to.equal("bogus");
  });

  it("checks row size and widget width", () => {
    expect(
      messages(
        "row {\n  value / source: workout\n  value / source: workout\n  value / source: workout\n  value / source: workout\n  value / source: workout\n}"
      )
    ).to.include("A row holds at most 4 items");
    expect(messages("row {\n  graph {\n  }\n  value / source: workout\n  value / source: workout\n}")).to.deep.equal([
      "A graph needs at least 1/2 of the row",
    ]);
  });

  it("keeps captions on widgets and rows", () => {
    const { layout } = compile("// ## This week\nrow {\n  // **Workouts**\n  value / source: workout\n}");
    expect(layout[0].caption).to.equal("## This week");
    expect(layout[0].items[0].caption).to.equal("**Workouts**");
  });
});
