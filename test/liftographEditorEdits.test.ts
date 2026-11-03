import "mocha";
import { expect } from "chai";
import {
  LiftographEditorEdits_canComplete,
  LiftographEditorEdits_selected,
  LiftographEditorEdits_typed,
} from "../src/liftograph/liftographEditorEdits";

describe("LiftographEditorEdits", () => {
  it("completes only without a selection", () => {
    const typed = LiftographEditorEdits_typed("value", 5);
    expect(LiftographEditorEdits_canComplete(typed)).to.equal(true);
    const selected = LiftographEditorEdits_selected(typed, 1, 3);
    expect(selected).to.deep.equal({ text: "value", start: 1, end: 3 });
    expect(LiftographEditorEdits_canComplete(selected)).to.equal(false);
  });

  it("collapses the selection when text changes", () => {
    expect(LiftographEditorEdits_typed("values", 6)).to.deep.equal({ text: "values", start: 6, end: 6 });
  });
});
