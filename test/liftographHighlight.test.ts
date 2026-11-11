import "mocha";
import { expect } from "chai";
import { LiftographDocument_parse } from "../src/liftograph/liftographDocument";
import {
  LiftographHighlight_lintSpans,
  LiftographHighlight_markRanges,
  LiftographHighlight_segments,
  LiftographHighlight_styledRanges,
  LiftographHighlight_tokens,
} from "../src/liftograph/liftographHighlight";
import { LiftoEditorParseCache } from "../src/components/primitives/liftoEditorBrain";

function tokensOf(text: string): string[] {
  return LiftographHighlight_tokens(LiftographDocument_parse(text)).map((t) => `${t.kind}:${text.slice(t.from, t.to)}`);
}

describe("LiftographHighlight", () => {
  it("drops empty and out-of-bounds mark ranges", () => {
    const ranges = [
      { start: 0, end: 3 },
      { start: 2, end: 2 },
      { start: 4, end: 9 },
    ];
    expect(LiftographHighlight_markRanges(ranges, 5)).to.eql([{ start: 0, end: 3 }]);
  });

  it("clamps diagnostics into the text, and drops them for an empty text", () => {
    const diagnostics = [{ message: "bad", span: { from: 8, to: 12 } }];
    expect(LiftographHighlight_lintSpans(diagnostics, 5)).to.eql([{ from: 4, to: 5, message: "bad" }]);
    expect(LiftographHighlight_lintSpans(diagnostics, 0)).to.eql([]);
  });

  it("splits a document into segments that cover the whole text, with styles on the tokens", () => {
    const text = "// **Squat**\ngraph / range: 1y {\n  name: Squat / source: exercise(Squat) {~ point(e1rm[0]) ~}\n}";
    const cache = new LiftoEditorParseCache();
    const segments = LiftographHighlight_segments(LiftographDocument_parse(text), (s) => cache.parseLiftoscript(s));
    expect(segments.map((s) => s.text).join("")).to.equal(text);
    const styled = segments.filter((s) => s.style != null).map((s) => s.text);
    expect(styled).to.include.members(["// **Squat**", "graph", "range", "1y", "exercise(Squat)"]);
    expect(segments.find((s) => s.text === "graph")?.style?.bold).to.equal(true);
    expect(styled.some((s) => s.indexOf("point") !== -1)).to.equal(true);
  });

  it("marks the kind, keys and values of a widget line", () => {
    expect(tokensOf("value / name: Squat / source: exercise(Squat)")).to.eql([
      "kind:value",
      "key:name",
      "value:Squat",
      "key:source",
      "value:exercise(Squat)",
    ]);
  });

  it("marks a row, its caption, its widgets and a hidden line", () => {
    const text = "// **Lifts**\nrow {\n  value / source: workout\n}\n/// graph {";
    expect(tokensOf(text)).to.eql([
      "caption:// **Lifts**",
      "kind:row",
      "kind:value",
      "key:source",
      "value:workout",
      "hidden:/// graph {",
    ]);
  });

  it("colours script tokens through the Liftoscript highlighter and tints errors", () => {
    const text = "graph {\n  name: A / source: exercise(Squat) {~ point(1) ~}\n}";
    const doc = LiftographDocument_parse(text);
    const cache = new LiftoEditorParseCache();
    const ranges = LiftographHighlight_styledRanges(doc, (script) => cache.parseLiftoscript(script), [
      { message: "bad", span: { from: 0, to: 5 } },
    ]);
    const scriptFrom = text.indexOf("point");
    expect(ranges.some((r) => r.start >= scriptFrom && r.end <= text.indexOf("~}"))).to.equal(true);
    expect(ranges.some((r) => r.backgroundColor != null && r.start === 0 && r.end === 5)).to.equal(true);
  });
});
