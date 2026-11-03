import "mocha";
import { expect } from "chai";
import { EditorHintPreferences_setDismissed } from "../src/components/primitives/editorHintPreferences";
import { LiftoEditorHints_helpId } from "../src/components/primitives/liftoEditorHints";
import { LiftographHints_helpId } from "../src/liftograph/liftographHints";

describe("EditorHintPreferences_setDismissed", () => {
  it("adds a help id once, however often it is dismissed", () => {
    const once = EditorHintPreferences_setDismissed([], LiftographHints_helpId, true);
    expect(EditorHintPreferences_setDismissed(once, LiftographHints_helpId, true)).to.deep.equal([
      LiftographHints_helpId,
    ]);
  });

  it("removes only its own id when re-enabled, so planner and dashboard hints stay independent", () => {
    const both = [LiftoEditorHints_helpId, LiftographHints_helpId];
    expect(EditorHintPreferences_setDismissed(both, LiftographHints_helpId, false)).to.deep.equal([
      LiftoEditorHints_helpId,
    ]);
    expect(EditorHintPreferences_setDismissed([], LiftoEditorHints_helpId, false)).to.deep.equal([]);
  });
});
