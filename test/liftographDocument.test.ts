import "mocha";
import { expect } from "chai";
import {
  ILiftographPair,
  ILiftographRowItem,
  ILiftographWidgetItem,
  LiftographDocument_diagnosticLabel,
  LiftographDocument_lineAt,
  LiftographDocument_parse,
  LiftographDocument_valueText,
} from "../src/liftograph/liftographDocument";

function raw(text: string, pair: ILiftographPair): string {
  return pair.value != null ? text.slice(pair.value.span.from, pair.value.span.to) : "";
}

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
    expect(value.pairs.map((p) => [p.key, raw(text, p)])).to.deep.equal([
      ["source", "exercise(Squat, label: T1)"],
      ["y", "e1rm"],
      ["compare", "4w"],
    ]);
    const graph = widget(doc.items[1]);
    expect(raw(text, graph.pairs[0])).to.equal("1y");
    expect(graph.series.length).to.equal(1);
    expect(graph.series[0].pairs.map((p) => p.key)).to.deep.equal(["name", "source", "y", "smooth"]);
    expect(doc.hiddenSpans.length).to.equal(1);
  });

  it("keeps spans that point back into the text", () => {
    const text = "value / name: Workouts / source: workout";
    const doc = LiftographDocument_parse(text);
    const pair = widget(doc.items[0]).pairs[1];
    expect(text.slice(pair.span.from, pair.span.to)).to.equal("source: workout");
    expect(raw(text, pair)).to.equal("workout");
  });

  it("never splits on a slash inside quotes or a script", () => {
    const text = 'graph {\n  name: "Push / Pull" / source: exercise {~\n    point(volume / 2)\n  ~}\n}';
    const doc = LiftographDocument_parse(text);
    expect(doc.diagnostics).to.deep.equal([]);
    const series = widget(doc.items[0]).series[0];
    expect(series.pairs.map((p) => raw(text, p))).to.deep.equal(['"Push / Pull"', "exercise"]);
    expect(series.script?.text.trim()).to.equal("point(volume / 2)");
  });

  it("joins a line that ends with a backslash to the next one, keeping spans in the text", () => {
    const text = [
      "graph / range: 1y {",
      "  name: Bench / source: exercise(Bench Press) / \\",
      "    group: max(1w) / \\",
      "    y: e1rm",
      "}",
      "// a comment \\",
      "value / source: workout",
    ].join("\n");
    const doc = LiftographDocument_parse(text);
    expect(doc.diagnostics).to.deep.equal([]);
    const series = widget(doc.items[0]).series[0];
    expect(series.pairs.map((p) => [p.key, raw(text, p)])).to.deep.equal([
      ["name", "Bench"],
      ["source", "exercise(Bench Press)"],
      ["group", "max(1w)"],
      ["y", "e1rm"],
    ]);
    const y = series.pairs[3];
    expect(text.slice(y.span.from, y.span.to)).to.equal("y: e1rm");
    expect(widget(doc.items[1]).caption?.markdown).to.equal("a comment \\");
  });

  it("joins a backslash line ending in CRLF the same way", () => {
    const text = "value / source: workout / \\\r\n  group: sum(1w)";
    const doc = LiftographDocument_parse(text);
    expect(doc.diagnostics).to.deep.equal([]);
    expect(widget(doc.items[0]).pairs.map((p) => [p.key, raw(text, p)])).to.deep.equal([
      ["source", "workout"],
      ["group", "sum(1w)"],
    ]);
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
  it("finds the logical line and its owner at a position, across a continuation", () => {
    const text = "row {\n  graph {\n    name: A / \\\n      y: e1rm\n  }\n}";
    const doc = LiftographDocument_parse(text);
    const line = LiftographDocument_lineAt(doc, text.indexOf("e1rm"));
    expect(text.slice(line!.span.from, line!.span.to)).to.equal("    name: A / \\\n      y: e1rm");
    expect(line!.owner).to.equal("graph");
    expect(LiftographDocument_lineAt(doc, text.indexOf("graph"))?.owner).to.equal("row");
    expect(LiftographDocument_lineAt(doc, 0)?.owner).to.equal("top");
  });

  it("reads typed values: quoted with escapes, calls with named and positional arguments, lists", () => {
    const text = 'value / name: "Row \\"Chest\\"" / source: exercise(Bench Press, label: T1) / show: map, sets';
    const [name, source, show] = widget(LiftographDocument_parse(text).items[0]).pairs;
    expect(name.value).to.deep.include({ type: "quoted", content: 'Row "Chest"', isClosed: true });
    expect(LiftographDocument_valueText(source.value!)).to.equal("exercise(Bench Press, label: T1)");
    expect(source.value?.type === "call" ? source.value.args.map((a) => a.type) : []).to.deep.equal([
      "positional",
      "named",
    ]);
    expect(show.value?.type === "list" ? show.value.items.map((a) => a.type) : []).to.deep.equal(["atom", "atom"]);
    expect(LiftographDocument_valueText(show.value!)).to.equal("map, sets");
  });

  it("parses calls inside a comma list, and keeps commas of an unclosed call as its arguments", () => {
    const closed = widget(LiftographDocument_parse("muscles / show: map, sets(chest, lats)").items[0]).pairs[0];
    expect(closed.value?.type === "list" ? closed.value.items.map((a) => a.type) : []).to.deep.equal(["atom", "call"]);
    expect(LiftographDocument_valueText(closed.value!)).to.equal("map, sets(chest, lats)");
    const open = widget(LiftographDocument_parse("muscles / show: map, sets(chest, lats").items[0]).pairs[0];
    expect(LiftographDocument_valueText(open.value!)).to.equal("map, sets(chest, lats");
  });

  it("keeps half-typed lines as structure: a bare key, an open call, an open quote", () => {
    const text = 'graph {\n  sou\n}\nvalue / source: exercise(Ben\nvalue / name: "Squ';
    const doc = LiftographDocument_parse(text);
    const [graph, call, quote] = doc.items.map(widget);
    expect(graph.series.length).to.equal(0);
    expect(call.pairs[0].value).to.deep.include({ type: "call", isClosed: false });
    expect(quote.pairs[0].value).to.deep.include({ type: "quoted", content: "Squ", isClosed: false });
  });

  it("reports each broken line once, however many follow it", () => {
    const text = Array.from({ length: 50 }, () => "value / : x").join("\n");
    expect(LiftographDocument_parse(text).diagnostics.length).to.equal(100);
  });

  it("keeps the widget when text follows a closed script, and flags the text", () => {
    const doc = LiftographDocument_parse("value / source: workout {~ point(1) ~} / name: x");
    const item = widget(doc.items[0]);
    expect(item.script?.text).to.equal(" point(1) ");
    expect(item.syntaxError).to.not.equal(undefined);
    expect(doc.diagnostics.map((d) => d.message)).to.include("Unexpected text at the end of the line");
  });

  it("keeps skipping an unknown block through a nested opener the grammar can't read", () => {
    const doc = LiftographDocument_parse(
      "table {\n  [x] {\n    value / source: workout\n  }\n}\nvalue / source: workout"
    );
    expect(doc.items.length).to.equal(2);
    expect(doc.diagnostics).to.deep.equal([]);
  });

  it("keeps parens in an unquoted argument, and strips one space after the caption mark", () => {
    const doc = LiftographDocument_parse("//  indented\nvalue / source: workout(program: PPL (Beginner))");
    const item = widget(doc.items[0]);
    expect(item.caption?.markdown).to.equal(" indented");
    const value = item.pairs[0].value;
    expect(value?.type === "call" ? LiftographDocument_valueText(value.args[0].value!) : "").to.equal("PPL (Beginner)");
  });

  it("marks a series line with a syntax error so it never runs", () => {
    const doc = LiftographDocument_parse("graph {\n  name: A / source: workout {~ point(1)\n}");
    const graph = widget(doc.items[0]);
    expect(graph.series[0].syntaxError?.message).to.equal("The script has no closing '~}'");
  });

  it("labels a diagnostic with its 1-based line and column", () => {
    const text = "// Hi\ngraph {\n  sparkles\n}";
    const at = (from: number): string =>
      LiftographDocument_diagnosticLabel(text, { message: "Bad", span: { from, to: from + 1 } });
    expect(at(0)).to.equal("1:1 Bad");
    expect(at(text.indexOf("sparkles"))).to.equal("3:3 Bad");
    expect(at(text.length + 5)).to.equal("4:2 Bad");
  });
});
