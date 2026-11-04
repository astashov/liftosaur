import "mocha";
import { expect } from "chai";
import { LiftographEditorAnalysis } from "../src/liftograph/liftographEditorAnalysis";
import { LiftographEditorAdapter, LiftographEditorAdapter_tokens } from "../src/liftograph/liftographEditorAdapter";
import { LiftographRail_exerciseEdit, LiftographRail_renameEdit } from "../src/liftograph/liftographRail";
import { LiftographHints_forLevel } from "../src/liftograph/liftographHints";
import type { ILiftoEditorPill } from "../src/components/primitives/liftoEditorActions";
import type { ILiftoEditorContext, ITextEdit } from "../src/components/primitives/liftoEditorBrain";
import { fxSettings } from "./liftographFixtures";

const GRAPH =
  "// Strength\ngraph / range: 3m {\n  name: Squat / source: exercise(Squat) / y: e1rm\n}\nvalue / source: workout";

function contextAt(text: string, needle: string, offset: number = 1): ILiftoEditorContext {
  const analysis = new LiftographEditorAnalysis(fxSettings());
  return new LiftographEditorAdapter(analysis).contextAt(text, text.indexOf(needle) + offset);
}

function diagnostics(text: string): string[] {
  return new LiftographEditorAnalysis(fxSettings()).compileDiagnostics(text).map((d) => d.message);
}

function pillsOf(context: ILiftoEditorContext): string[] {
  return context.levels[context.levels.length - 1]?.pills.map((p) => p.label) ?? [];
}

function apply(text: string, edits: ITextEdit[]): string {
  return [...edits]
    .sort((a, b) => b.start - a.start)
    .reduce((memo, edit) => memo.slice(0, edit.start) + edit.text + memo.slice(edit.end), text);
}

function pillNamed(context: ILiftoEditorContext, label: string): ILiftoEditorPill {
  const found = context.levels[context.levels.length - 1]?.pills.find((p) => p.label === label);
  if (found == null) {
    throw new Error(`no pill '${label}' in ${pillsOf(context).join(", ")}`);
  }
  return found;
}

describe("LiftographRail", () => {
  it("builds levels from the document for blocks and from the tree for fields and arguments", () => {
    expect(contextAt(GRAPH, "3m").breadcrumb).to.deep.equal(["graph", "range"]);
    expect(contextAt(GRAPH, "exercise(Squat)", 10).breadcrumb).to.deep.equal(["graph", "Squat", "source", "Squat"]);
    expect(contextAt(GRAPH, "workout").breadcrumb).to.deep.equal(["value", "source"]);
    expect(contextAt(GRAPH, "Strength").breadcrumb).to.deep.equal(["text"]);
  });

  it("offers every value of a key, wherever the tap lands in it", () => {
    expect(pillsOf(contextAt(GRAPH, "3m", 1))).to.deep.equal(["1m", "3m", "6m", "1y", "all"]);
    expect(pillsOf(contextAt(GRAPH, "3m", 0))).to.deep.equal(["1m", "3m", "6m", "1y", "all"]);
    const year = pillNamed(contextAt(GRAPH, "3m"), "1y");
    expect(apply(GRAPH, [{ start: year.start, end: year.end, text: year.text }])).to.contain("range: 1y {");
  });

  it("offers exercise change and filters on the exercise name, and no equipment", () => {
    const pills = pillsOf(contextAt(GRAPH, "exercise(Squat)", 10));
    expect(pills).to.deep.equal(["Change exercise", "Add program", "Add label", "Add day"]);
  });

  it("adds a series before the closing brace and focuses its exercise", () => {
    const add = pillNamed(contextAt(GRAPH, "graph"), "Add series");
    const next = apply(GRAPH, [{ start: add.start, end: add.end, text: add.text }]);
    expect(next).to.contain("  name: New series / source: exercise(Squat)\n}");
    expect(next.slice(add.focusAt, add.focusAt! + 5)).to.equal("Squat");
  });

  it("adds a missing key at the end of the line and focuses its value", () => {
    const series = contextAt(GRAPH, "name: Squat", 0);
    const add = series.levels[1].pills.find((p) => p.label === "Add mark")!;
    const next = apply(GRAPH, [{ start: add.start, end: add.end, text: add.text }]);
    expect(next).to.contain("y: e1rm / mark: bars\n");
    expect(next.slice(add.focusAt, add.focusAt! + 4)).to.equal("bars");
  });

  it("removes a field with its separator, and a widget with its caption", () => {
    const range = contextAt(GRAPH, "3m");
    expect(apply(GRAPH, range.levels[1].removeEdits ?? [])).to.contain("graph {\n");
    expect(apply(GRAPH, range.levels[0].removeEdits ?? [])).to.equal("value / source: workout");
  });

  it("opens an empty dashboard on the widget templates", () => {
    const context = contextAt("", "", 0);
    expect(context.breadcrumb).to.deep.equal(["dashboard"]);
    expect(pillsOf(context)).to.include.members(["graph", "value", "row"]);
  });

  it("builds the exercise swap and rename edits with quoting, dropping the old equipment", () => {
    const pill: ILiftoEditorPill = { kind: "liftograph", label: "", category: "neutral", start: 3, end: 18, text: "" };
    expect(LiftographRail_exerciseEdit(pill, "Bench Press", "Dumbbell").text).to.equal("Bench Press, Dumbbell");
    expect(LiftographRail_exerciseEdit(pill, "Curl, Hammer", undefined).text).to.equal('"Curl, Hammer"');
    expect(LiftographRail_renameEdit(pill, "Push / Pull").text).to.equal('"Push / Pull"');
  });

  it("keeps named filters when the exercise changes, and drops the old equipment", () => {
    const text = "value / source: exercise(Squat, program: X, Barbell)";
    const pill = pillNamed(contextAt(text, "Squat", 1), "Change exercise");
    const swap = { ...pill, ...LiftographRail_exerciseEdit(pill, "Bench Press", "Dumbbell") };
    const edits = [{ start: swap.start, end: swap.end, text: swap.text }, ...(swap.extraEdits ?? [])];
    expect(apply(text, edits)).to.equal("value / source: exercise(Bench Press, Dumbbell, program: X)");
  });

  it("drops the arguments when switching to a preset that takes none", () => {
    const text = "value / source: workout / y: muscleSets(chest)";
    const volume = pillNamed(contextAt(text, "muscleSets", 1), "volume");
    const next = apply(text, [{ start: volume.start, end: volume.end, text: volume.text }]);
    expect(next).to.equal("value / source: workout / y: volume");
    expect(diagnostics(next)).to.deep.equal([]);
  });

  it("adds a workout source to muscles, and offers only workout there", () => {
    const text = "muscles / show: map, sets / range: 4w";
    const add = pillNamed(contextAt(text, "muscles", 1), "Add source");
    const next = apply(text, [{ start: add.start, end: add.end, text: add.text }]);
    expect(next).to.contain("source: workout");
    expect(diagnostics(next)).to.deep.equal([]);
    expect(pillsOf(contextAt(next, "workout", 1))).to.deep.equal(["workout", "Add program", "Add day"]);
  });

  it("turns a bare workout source into a filtered call and opens text editing after the colon", () => {
    const text = "muscles / source: workout";
    const add = pillNamed(contextAt(text, "workout", 1), "Add program");
    const next = apply(text, [{ start: add.start, end: add.end, text: add.text }]);
    expect(next).to.equal("muscles / source: workout(program: )");
    expect(add.freeformAt).to.equal(next.indexOf(")"));
  });

  it("adds muscles and calendar widgets to a row", () => {
    const text = "row {\n  value / source: workout\n}";
    const pills = pillsOf(contextAt(text, "row", 1));
    expect(pills).to.include.members(["Add muscles", "Add calendar"]);
    const add = pillNamed(contextAt(text, "row", 1), "Add calendar");
    const next = apply(text, [{ start: add.start, end: add.end, text: add.text }]);
    expect(next).to.contain("\n  calendar / range: 3m\n}");
    expect(diagnostics(next)).to.deep.equal([]);
  });

  it("keeps show: pills on a list with sets(...), and each one replaces the whole value", () => {
    const text = "muscles / show: map, sets(chest, lats)";
    expect(pillsOf(contextAt(text, "map", 1))).to.include.members(["map", "sets", "map, sets"]);
    const map = pillNamed(contextAt(text, "map", 1), "map");
    expect(apply(text, [{ start: map.start, end: map.end, text: map.text }])).to.equal("muscles / show: map");
  });

  it("adds another group inside sets(...)", () => {
    const text = "muscles / show: map, sets(chest, lats)";
    const add = pillNamed(contextAt(text, "lats", 1), "Add group");
    const next = apply(text, [{ start: add.start, end: add.end, text: add.text }]);
    expect(next).to.equal("muscles / show: map, sets(chest, lats, )");
    expect(add.freeformAt).to.equal(next.length - 1);
    expect(pillsOf(contextAt(text, "lats", 1))).to.include("neck");
  });

  it("smooths a numeric-axis series with a numeric window", () => {
    const text = "graph {\n  name: A / source: workout {~ point(1, 2) ~}\n}";
    const add = contextAt(text, "name: A", 0).levels[1].pills.find((p) => p.label === "Add smooth")!;
    const next = apply(text, [{ start: add.start, end: add.end, text: add.text }]);
    expect(next).to.contain("smooth: avg(5)");
    expect(diagnostics(next)).to.deep.equal([]);
  });

  it("adds a child inside an unclosed block", () => {
    const graph = pillNamed(contextAt("graph {", "graph"), "Add series");
    expect(apply("graph {", [{ start: graph.start, end: graph.end, text: graph.text }])).to.equal(
      "graph {\n  name: New series / source: exercise(Squat)"
    );
    const row = pillNamed(contextAt("row {", "row"), "Add value");
    expect(apply("row {", [{ start: row.start, end: row.end, text: row.text }])).to.equal(
      "row {\n  value / source: exercise(Squat)"
    );
  });

  it("labels a quoted series name without its quotes", () => {
    const text = 'graph {\n  name: "Push / Pull" / source: workout\n}';
    expect(contextAt(text, "source").breadcrumb[1]).to.equal("Push / Pull");
  });

  it("has a hint for each widget and key level", () => {
    expect(LiftographHints_forLevel(contextAt(GRAPH, "3m").levels[1])?.short).to.equal("How far back");
    expect(LiftographHints_forLevel(contextAt(GRAPH, "graph").levels[0])?.short).to.equal(
      "A chart with one or more series"
    );
  });
});

describe("LiftographEditorAdapter_tokens", () => {
  it("stops on keys, values, call names, arguments, captions and whole scripts", () => {
    const text = "// Hi\nvalue / source: exercise(Squat, Barbell) {~ point(1) ~}";
    const analysis = new LiftographEditorAnalysis(fxSettings());
    expect(LiftographEditorAdapter_tokens(analysis.document(text)).map((t) => t.text)).to.deep.equal([
      "// Hi",
      "value",
      "source",
      "exercise",
      "Squat",
      "Barbell",
      "{~ point(1) ~}",
    ]);
  });
});
