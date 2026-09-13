import "mocha";
import { expect } from "chai";
import {
  ExerciseLiftoEditorAnalysis_initial,
  ExerciseLiftoEditorAnalysis_key,
  ExerciseLiftoEditorAnalysis_ran,
  ExerciseLiftoEditorAnalysis_shouldRun,
} from "../src/models/exerciseLiftoEditorAnalysis";

describe("ExerciseLiftoEditorAnalysis", () => {
  it("runs the first analysis", () => {
    const key = ExerciseLiftoEditorAnalysis_key(0, false, "Squat / 5x5");
    expect(ExerciseLiftoEditorAnalysis_shouldRun(ExerciseLiftoEditorAnalysis_initial(), key)).to.equal(true);
  });

  it("does not run the same key twice", () => {
    const key = ExerciseLiftoEditorAnalysis_key(0, false, "Squat / 5x5");
    const state = ExerciseLiftoEditorAnalysis_ran(ExerciseLiftoEditorAnalysis_initial(), key);
    expect(ExerciseLiftoEditorAnalysis_shouldRun(state, key)).to.equal(false);
  });

  it("runs again when the text changes", () => {
    const state = ExerciseLiftoEditorAnalysis_ran(
      ExerciseLiftoEditorAnalysis_initial(),
      ExerciseLiftoEditorAnalysis_key(0, false, "Squat / 5x5")
    );
    expect(
      ExerciseLiftoEditorAnalysis_shouldRun(state, ExerciseLiftoEditorAnalysis_key(0, false, "Squat / 5x3"))
    ).to.equal(true);
  });

  it("runs again when the panel opens on the same text", () => {
    const state = ExerciseLiftoEditorAnalysis_ran(
      ExerciseLiftoEditorAnalysis_initial(),
      ExerciseLiftoEditorAnalysis_key(0, false, "Squat / 5x5")
    );
    expect(
      ExerciseLiftoEditorAnalysis_shouldRun(state, ExerciseLiftoEditorAnalysis_key(0, true, "Squat / 5x5"))
    ).to.equal(true);
  });

  it("runs again when the program's revision moves under the same text", () => {
    const state = ExerciseLiftoEditorAnalysis_ran(
      ExerciseLiftoEditorAnalysis_initial(),
      ExerciseLiftoEditorAnalysis_key(0, true, "Squat / 5x5")
    );
    expect(
      ExerciseLiftoEditorAnalysis_shouldRun(state, ExerciseLiftoEditorAnalysis_key(1, true, "Squat / 5x5"))
    ).to.equal(true);
  });

  it("keeps the same state object when the key was already recorded", () => {
    const key = ExerciseLiftoEditorAnalysis_key(0, false, "Squat / 5x5");
    const state = ExerciseLiftoEditorAnalysis_ran(ExerciseLiftoEditorAnalysis_initial(), key);
    expect(ExerciseLiftoEditorAnalysis_ran(state, key)).to.equal(state);
  });
});
