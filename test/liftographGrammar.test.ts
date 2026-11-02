import "mocha";
import { expect } from "chai";
import { Tree } from "@lezer/common";
import { parser } from "../src/liftograph/liftographParser";
import { IncrementalParseCache } from "../src/utils/incrementalParseCache";

function nodes(text: string, tree: Tree = parser.parse(text)): string[] {
  const out: string[] = [];
  tree.iterate({
    enter: (n) => {
      out.push(`${n.name}@${n.from}-${n.to}`);
    },
  });
  return out;
}

function named(text: string, name: string): string[] {
  const out: string[] = [];
  parser.parse(text).iterate({
    enter: (n) => {
      if (n.name === name) {
        out.push(text.slice(n.from, n.to));
      }
    },
  });
  return out;
}

function hasError(text: string): boolean {
  return nodes(text).some((n) => n.startsWith("⚠"));
}

describe("liftograph grammar", () => {
  it("reads widget lines, fields, calls, quoted values and lists without errors", () => {
    const text =
      'graph / range: 1y {\n  name: "Push / Pull" / source: exercise(Bench Press, label: T1) / show: map, sets\n}';
    expect(hasError(text)).to.equal(false);
    expect(named(text, "Head")).to.deep.equal(["graph", 'name: "Push / Pull"']);
    expect(named(text, "Field")).to.deep.equal([
      "range: 1y",
      "source: exercise(Bench Press, label: T1)",
      "show: map, sets",
    ]);
    expect(named(text, "NamedArg")).to.deep.equal(["label: T1"]);
    expect(named(text, "List")).to.deep.equal(["map, sets"]);
    expect(named(text, "Duration")).to.deep.equal(["1y"]);
  });

  it("skips a backslash continuation, LF or CRLF, inside one line", () => {
    for (const text of [
      "value / source: workout / \\\n  group: sum(1w)",
      "value / source: workout / \\\r\n  group: sum(1w)",
    ]) {
      expect(hasError(text)).to.equal(false);
      expect(named(text, "Line").length).to.equal(1);
      expect(named(text, "Field")).to.deep.equal(["source: workout", "group: sum(1w)"]);
    }
  });

  it("reads a script to the first closing marker, even with a tilde inside, and flags an unclosed one", () => {
    const text = "graph {\n  name: A / source: workout {~\n    point(volume / 2) // ~ hi\n  ~}\n}";
    expect(hasError(text)).to.equal(false);
    expect(named(text, "ScriptBody")).to.deep.equal(["\n    point(volume / 2) // ~ hi\n  "]);
    expect(hasError("value / source: workout {~ point(1)")).to.equal(true);
  });

  it("keeps text and hidden lines whole, with any characters", () => {
    const text = "// **Squat** / {~ (x)\n/// value / source: workout";
    expect(hasError(text)).to.equal(false);
    expect(named(text, "TextLine")).to.deep.equal(["// **Squat** / {~ (x)"]);
    expect(named(text, "HiddenLine")).to.deep.equal(["/// value / source: workout"]);
  });

  it("parses half-typed input into structure: a bare key, an empty value, an open call and an open quote", () => {
    expect(named("graph {\n  sou", "Head")).to.deep.equal(["graph", "sou"]);
    expect(named("value / source:", "Field")).to.deep.equal(["source:"]);
    expect(named("value / source: exercise(Ben", "Call")).to.deep.equal(["exercise(Ben"]);
    expect(named("value / source: exercise(Squat, ", "Call")).to.deep.equal(["exercise(Squat,"]);
    expect(named('value / name: "Squ', "Quoted")).to.deep.equal(['"Squ']);
    expect(named('value / name: "Squ\nvalue / source: workout', "Field")).to.deep.equal([
      'name: "Squ',
      "source: workout",
    ]);
  });

  it("splits quotes into text and escapes, captions into mark and content, and nests parens in arguments", () => {
    expect(named('name: "a\\"b"', "QuoteText")).to.deep.equal(["a", "b"]);
    expect(named('name: "a\\"b"', "Escape")).to.deep.equal(['\\"']);
    expect(named("//  indented\n//tight", "SpacedCaption")).to.deep.equal(["//  indented"]);
    expect(named("//  indented\n//tight", "Caption")).to.deep.equal(["//tight"]);
    expect(named("[x] {", "TextLine")).to.deep.equal([]);
    expect(named("v / source: workout(program: PPL (Beginner))", "Group")).to.deep.equal(["(Beginner)"]);
  });

  it("keeps an error in an unknown block local to its line", () => {
    const text = "table {\n  anything [x] = 5 {\n  }\n}\nvalue / source: workout";
    expect(named(text, "Line")).to.deep.equal(["table {", "anything [x] = 5 {", "}", "}", "value / source: workout"]);
  });

  it("gives the same tree after incremental edits as after a full parse", () => {
    const steps = [
      "graph {\n  name: A / source: workout\n}",
      "graph {\n  name: A / source: workout / y: vol\n}",
      "graph {\n  name: A / source: workout / y: volume\n}\n",
      'row {\n  graph {\n  name: "A / B" / source: exercise(Squat, Barbell) {~ point(max(e1rm)) ~}\n}\n',
      'row {\n  graph {\n  name: "A / B" / source: exercise(Squat, Barbell) {~ point(max(e1rm)) \\\n ~}\n}\n',
      "value / source: workout / \\\r\n  group: sum(1w)",
    ];
    const cache = new IncrementalParseCache(parser);
    for (const text of steps) {
      expect(nodes(text, cache.parse(text))).to.deep.equal(nodes(text));
    }
  });
});
