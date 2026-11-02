import "mocha";
import { expect } from "chai";
import { EditorState } from "@codemirror/state";
import { LiftographDocument_parse } from "../src/liftograph/liftographDocument";
import { LiftographLanguage_foldRange, LiftographLanguage_indent } from "../src/liftograph/liftographLanguage";

describe("LiftographLanguage", () => {
  it("indents inside a block, from its opening line or a body line", () => {
    const text = "row {\n  graph {\n    name: A / source: workout\n  }\n}\nvalue / source: workout";
    const doc = LiftographDocument_parse(text);
    expect(LiftographLanguage_indent(doc, text.indexOf("row {") + 5)).to.equal(2);
    expect(LiftographLanguage_indent(doc, text.indexOf("graph {") + 7)).to.equal(4);
    expect(LiftographLanguage_indent(doc, text.indexOf("name:"))).to.equal(4);
    expect(LiftographLanguage_indent(doc, text.indexOf("value"))).to.equal(undefined);
  });

  it("folds a graph from the end of its header to the line before its closing brace", () => {
    const text = "graph {\n  name: A / source: workout\n}";
    const state = EditorState.create({ doc: text });
    const range = LiftographLanguage_foldRange(LiftographDocument_parse(text), state, 0, 7);
    expect(range).to.deep.equal({ from: 7, to: text.indexOf("\n}") });
  });
});
