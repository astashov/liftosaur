import "mocha";
import { expect } from "chai";
import { LiftographDocument_parse } from "../src/liftograph/liftographDocument";
import { LiftographHighlight_styledRanges, LiftographHighlight_tokens } from "../src/liftograph/liftographHighlight";
import { LiftoEditorParseCache } from "../src/components/primitives/liftoEditorBrain";

function tokensOf(text: string): string[] {
  return LiftographHighlight_tokens(LiftographDocument_parse(text)).map((t) => `${t.kind}:${text.slice(t.from, t.to)}`);
}

describe("LiftographHighlight", () => {
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
    const ranges = LiftographHighlight_styledRanges(doc, new LiftoEditorParseCache(), [
      { message: "bad", span: { from: 0, to: 5 } },
    ]);
    const scriptFrom = text.indexOf("point");
    expect(ranges.some((r) => r.start >= scriptFrom && r.end <= text.indexOf("~}"))).to.equal(true);
    expect(ranges.some((r) => r.backgroundColor != null && r.start === 0 && r.end === 5)).to.equal(true);
  });
});
