import "mocha";
import { expect } from "chai";
import {
  LiftographEditorEdits_canComplete,
  LiftographEditorEdits_init,
  LiftographEditorEdits_saveText,
  LiftographEditorEdits_selected,
  LiftographEditorEdits_typed,
} from "../src/liftograph/liftographEditorEdits";

describe("LiftographEditorEdits", () => {
  it("starts with the caret at the end, and completes only without a selection", () => {
    const opened = LiftographEditorEdits_init("value");
    expect(opened).to.deep.equal({ text: "value", start: 5, end: 5 });
    expect(LiftographEditorEdits_canComplete(opened)).to.equal(true);
    const selected = LiftographEditorEdits_selected(opened, 1, 3);
    expect(selected).to.deep.equal({ text: "value", start: 1, end: 3 });
    expect(LiftographEditorEdits_canComplete(selected)).to.equal(false);
  });

  it("collapses the selection when text changes", () => {
    expect(LiftographEditorEdits_typed("values", 6)).to.deep.equal({ text: "values", start: 6, end: 6 });
  });

  it("saves the editor's own text when it has one, and the last known text otherwise", () => {
    const state = LiftographEditorEdits_init("value");
    expect(LiftographEditorEdits_saveText(state, "value / x")).to.equal("value / x");
    expect(LiftographEditorEdits_saveText(state, undefined)).to.equal("value");
  });
});
