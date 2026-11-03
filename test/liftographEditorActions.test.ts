import "mocha";
import { expect } from "chai";
import {
  LiftographEditorActions_picked,
  LiftographEditorActions_press,
  LiftographEditorActions_renamed,
} from "../src/liftograph/liftographEditorActions";
import type { ILiftoEditorPill } from "../src/components/primitives/liftoEditorActions";
import { fxSettings } from "./liftographFixtures";

function pill(extra: Partial<ILiftoEditorPill>): ILiftoEditorPill {
  return { kind: "liftograph", label: "", category: "neutral", start: 3, end: 8, text: "Squat", ...extra };
}

describe("LiftographEditorActions", () => {
  it("applies a plain pill at once and leaves nothing pending", () => {
    const plain = pill({ label: "1y" });
    expect(LiftographEditorActions_press(plain)).to.deep.equal({
      pending: undefined,
      effect: { type: "apply", pill: plain },
    });
  });

  it("opens the rename prompt and applies the quoted name it returns", () => {
    const { pending, effect } = LiftographEditorActions_press(pill({ action: "rename" }));
    expect(effect).to.deep.equal({ type: "openRename", placeholder: "Squat" });
    const result = LiftographEditorActions_renamed(pending, "Push / Pull");
    expect(result.pending).to.equal(undefined);
    expect(result.apply).to.deep.include({ start: 3, end: 8, text: '"Push / Pull"', action: undefined });
  });

  it("applies nothing on a cancelled prompt, or a result with no matching pending action", () => {
    const rename = LiftographEditorActions_press(pill({ action: "rename" })).pending;
    expect(LiftographEditorActions_renamed(rename, undefined)).to.deep.equal({ pending: undefined });
    expect(LiftographEditorActions_renamed(undefined, "A")).to.deep.equal({ pending: undefined });
    const selected = { type: "adhoc" as const, exerciseType: { id: "benchPress", equipment: "dumbbell" } };
    expect(LiftographEditorActions_picked(rename, selected, fxSettings())).to.deep.equal({ pending: undefined });
  });

  it("swaps the exercise from the picker, and ignores a template pick", () => {
    const { pending, effect } = LiftographEditorActions_press(pill({ action: "changeExercise" }));
    expect(effect).to.deep.equal({ type: "openPicker" });
    const selected = { type: "adhoc" as const, exerciseType: { id: "benchPress", equipment: "dumbbell" } };
    expect(LiftographEditorActions_picked(pending, selected, fxSettings()).apply?.text).to.equal(
      "Bench Press, Dumbbell"
    );
    const template = { type: "template" as const, name: "T" };
    expect(LiftographEditorActions_picked(pending, template, fxSettings()).apply).to.equal(undefined);
  });
});
