import "mocha";
import { expect } from "chai";
import {
  ILiftographRowItem,
  ILiftographWidgetItem,
  LiftographDocument_parse,
  LiftographDocument_splitArgs,
  LiftographDocument_unquote,
} from "../src/liftograph/liftographDocument";

function widget(item: unknown): ILiftographWidgetItem {
  const w = item as ILiftographWidgetItem;
  expect(w.type).to.equal("widget");
  return w;
}

describe("LiftographDocument_parse", () => {
  it("reads the reference example into rows, graphs, captions and hidden lines", () => {
    const text = [
      "// ## Strength",
      "row {",
      "  // **Squat**",
      "  value / source: exercise(Squat, label: T1) / y: e1rm / compare: 4w",
      "}",
      "",
      "graph / range: 1y {",
      "  name: Squat / source: exercise(Squat) / y: e1rm / smooth: avg(5)",
      "}",
      "/// hidden note",
      "row {",
      "  muscles / range: 7d",
      "  calendar / range: 6m",
      "}",
    ].join("\n");
    const doc = LiftographDocument_parse(text);
    expect(doc.diagnostics).to.deep.equal([]);
    expect(doc.items.length).to.equal(3);
    const row = doc.items[0] as ILiftographRowItem;
    expect(row.caption?.markdown).to.equal("## Strength");
    const value = widget(row.items[0]);
    expect(value.kind).to.equal("value");
    expect(value.caption?.markdown).to.equal("**Squat**");
    expect(value.pairs.map((p) => [p.key, p.value])).to.deep.equal([
      ["source", "exercise(Squat, label: T1)"],
      ["y", "e1rm"],
      ["compare", "4w"],
    ]);
    const graph = widget(doc.items[1]);
    expect(graph.pairs[0].value).to.equal("1y");
    expect(graph.series.length).to.equal(1);
    expect(graph.series[0].pairs.map((p) => p.key)).to.deep.equal(["name", "source", "y", "smooth"]);
    expect(doc.hiddenSpans.length).to.equal(1);
  });

  it("keeps spans that point back into the text", () => {
    const text = "value / name: Workouts / source: workout";
    const doc = LiftographDocument_parse(text);
    const pair = widget(doc.items[0]).pairs[1];
    expect(text.slice(pair.span.from, pair.span.to)).to.equal("source: workout");
    expect(text.slice(pair.valueSpan.from, pair.valueSpan.to)).to.equal("workout");
  });

  it("never splits on a slash inside quotes or a script", () => {
    const text = 'graph {\n  name: "Push / Pull" / source: exercise {~\n    point(volume / 2)\n  ~}\n}';
    const doc = LiftographDocument_parse(text);
    expect(doc.diagnostics).to.deep.equal([]);
    const series = widget(doc.items[0]).series[0];
    expect(series.pairs.map((p) => p.value)).to.deep.equal(['"Push / Pull"', "exercise"]);
    expect(series.script?.text.trim()).to.equal("point(volume / 2)");
  });

  it("makes a text block followed by a blank line its own item", () => {
    const doc = LiftographDocument_parse("row {\n  // **Goal:** 4 a week\n\n  value / source: workout\n}");
    const row = doc.items[0] as ILiftographRowItem;
    expect(row.items.map((i) => i.type)).to.deep.equal(["text", "widget"]);
    expect(widget(row.items[1]).caption).to.equal(undefined);
  });

  it("skips the block of an unknown kind as one balanced block", () => {
    const doc = LiftographDocument_parse("table {\n  anything {\n  }\n}\nvalue / source: workout");
    expect(doc.diagnostics).to.deep.equal([]);
    expect(doc.items.map((i) => (i.type === "widget" ? i.kind : i.type))).to.deep.equal(["table", "value"]);
  });

  it("reports a missing brace on the opening line and keeps the rest", () => {
    const text = "row {\n  graph {\n    name: A / source: exercise / y: volume\n  value / source: workout\n}";
    const doc = LiftographDocument_parse(text);
    const messages = doc.diagnostics.map((d) => [d.message, text.slice(d.span.from, d.span.to).trim()]);
    expect(messages).to.deep.equal([
      ["Expected a series line, like 'name: Squat / source: exercise(Squat)'", "value / source: workout"],
      ["This block has no closing '}'", "row {"],
    ]);
  });

  it("spans an item through its closing brace, or to the end of an unclosed block", () => {
    const text = "table {\n  anything {\n  }\n}\nvalue / source: workout\ngraph {\n  name: A / source: workout";
    const doc = LiftographDocument_parse(text);
    const slices = doc.items.map((item) => text.slice(item.span.from, item.span.to));
    expect(slices).to.deep.equal([
      "table {\n  anything {\n  }\n}",
      "value / source: workout",
      "graph {\n  name: A / source: workout",
    ]);
  });

  it("reports a script with no closing marker", () => {
    const doc = LiftographDocument_parse("value / source: workout {~ point(1)");
    expect(doc.diagnostics.map((d) => d.message)).to.deep.equal(["The script has no closing '~}'"]);
  });
});

describe("LiftographDocument helpers", () => {
  it("unquotes and splits arguments", () => {
    expect(LiftographDocument_unquote('"Row \\"Chest\\""')).to.equal('Row "Chest"');
    expect(LiftographDocument_splitArgs('"Row (Chest Supported)", Dumbbell, label: T1')).to.deep.equal([
      '"Row (Chest Supported)"',
      "Dumbbell",
      "label: T1",
    ]);
  });
});
