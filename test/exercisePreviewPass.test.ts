import "mocha";
import { expect } from "chai";
import {
  ExercisePreviewPass_applied,
  ExercisePreviewPass_close,
  ExercisePreviewPass_error,
  ExercisePreviewPass_flush,
  ExercisePreviewPass_initial,
  ExercisePreviewPass_isPending,
  ExercisePreviewPass_materialized,
  ExercisePreviewPass_textChanged,
  ExercisePreviewPass_timerElapsed,
  IExercisePreviewPassState,
} from "../src/models/exercisePreviewPass";

const error = { message: "There's no state variable 'increase'" };

function open(text: string = "Squat / 5x3 / 150lb"): IExercisePreviewPassState {
  return ExercisePreviewPass_materialized(ExercisePreviewPass_initial(), text).state;
}

describe("ExercisePreviewPass", () => {
  it("opens settled on the materialized text and is not pending", () => {
    const state = open();
    expect(state.phase).to.equal("settled");
    expect(ExercisePreviewPass_isPending(state)).to.equal(false);
  });

  it("applies at once after a pill", () => {
    const step = ExercisePreviewPass_textChanged(open(), "Squat / 5x3 / 160lb", false);
    expect(step.state.phase).to.equal("applying");
    expect(step.effects).to.deep.equal([{ type: "applyPreview", token: 1, panelText: "Squat / 5x3 / 160lb" }]);
  });

  it("schedules after a keypad key and becomes pending", () => {
    const step = ExercisePreviewPass_textChanged(open(), "Squat / 5x3 / 16lb", true);
    expect(step.state.phase).to.equal("scheduled");
    expect(step.effects).to.deep.equal([{ type: "schedule", token: 1 }]);
    expect(ExercisePreviewPass_isPending(step.state)).to.equal(true);
  });

  it("cancels the earlier timer when a second key lands", () => {
    const first = ExercisePreviewPass_textChanged(open(), "Squat / 5x3 / 1lb", true);
    const second = ExercisePreviewPass_textChanged(first.state, "Squat / 5x3 / 16lb", true);
    expect(second.effects).to.deep.equal([{ type: "cancel" }, { type: "schedule", token: 2 }]);
    expect(ExercisePreviewPass_timerElapsed(second.state, 1).effects).to.deep.equal([]);
    expect(ExercisePreviewPass_timerElapsed(second.state, 2).effects).to.deep.equal([
      { type: "applyPreview", token: 2, panelText: "Squat / 5x3 / 16lb" },
    ]);
  });

  it("syncs the line and settles after a successful apply", () => {
    const applying = ExercisePreviewPass_textChanged(open(), "Squat / 5x3 / 160lb", false);
    const step = ExercisePreviewPass_applied(applying.state, 1, { blurb: "Squat / ...t1 / 160lb" });
    expect(step.state.phase).to.equal("settled");
    expect(step.effects).to.deep.equal([{ type: "syncLine", blurb: "Squat / ...t1 / 160lb" }]);
    expect(step.result).to.deep.equal({ blurb: "Squat / ...t1 / 160lb" });
    expect(ExercisePreviewPass_isPending(step.state)).to.equal(false);
  });

  it("ignores a result for a token that is no longer current", () => {
    const applying = ExercisePreviewPass_textChanged(open(), "Squat / 5x3 / 160lb", false);
    const step = ExercisePreviewPass_applied(applying.state, 7, { blurb: "stale" });
    expect(step.state).to.equal(applying.state);
    expect(step.effects).to.deep.equal([]);
    expect(step.result).to.equal(undefined);
  });

  it("stays pending with its text after a failed apply", () => {
    const applying = ExercisePreviewPass_textChanged(open(), "Squat / 5x3 / progress: custom()", false);
    const step = ExercisePreviewPass_applied(applying.state, 1, { error });
    expect(step.state.phase).to.equal("failed");
    expect(ExercisePreviewPass_isPending(step.state)).to.equal(true);
    expect(ExercisePreviewPass_error(step.state)).to.equal(error);
    expect(step.state.phase === "failed" && step.state.panelText).to.equal("Squat / 5x3 / progress: custom()");
  });

  it("flushes a scheduled write now", () => {
    const scheduled = ExercisePreviewPass_textChanged(open(), "Squat / 5x3 / 16lb", true);
    const step = ExercisePreviewPass_flush(scheduled.state);
    expect(step.state.phase).to.equal("applying");
    expect(step.effects).to.deep.equal([
      { type: "cancel" },
      { type: "applyPreview", token: 2, panelText: "Squat / 5x3 / 16lb" },
    ]);
  });

  it("flushes a failed pass as its error, so Save stops at the banner", () => {
    const applying = ExercisePreviewPass_textChanged(open(), "bad", false);
    const failed = ExercisePreviewPass_applied(applying.state, 1, { error });
    const step = ExercisePreviewPass_flush(failed.state);
    expect(step.result).to.deep.equal({ error });
    expect(step.effects).to.deep.equal([]);
  });

  it("flushes nothing when settled", () => {
    const step = ExercisePreviewPass_flush(open());
    expect(step.result).to.equal(undefined);
    expect(step.effects).to.deep.equal([]);
  });

  it("keeps its state when the program materializes the same text", () => {
    const scheduled = ExercisePreviewPass_textChanged(open(), "Squat / 5x3 / 16lb", true);
    const step = ExercisePreviewPass_materialized(scheduled.state, "Squat / 5x3 / 16lb");
    expect(step.state).to.equal(scheduled.state);
    expect(step.effects).to.deep.equal([]);
  });

  it("settles on a different materialized text and cancels a scheduled write", () => {
    const scheduled = ExercisePreviewPass_textChanged(open(), "Squat / 5x3 / 16lb", true);
    const step = ExercisePreviewPass_materialized(scheduled.state, "Squat / 4x4 / 150lb");
    expect(step.state).to.deep.equal({ phase: "settled", token: 1, panelText: "Squat / 4x4 / 150lb" });
    expect(step.effects).to.deep.equal([{ type: "cancel" }]);
  });

  it("closes on a missing materialized text", () => {
    const step = ExercisePreviewPass_materialized(open(), undefined);
    expect(step.state.phase).to.equal("closed");
  });

  it("clears the error and the pending flag on close", () => {
    const applying = ExercisePreviewPass_textChanged(open(), "bad", false);
    const failed = ExercisePreviewPass_applied(applying.state, 1, { error });
    const step = ExercisePreviewPass_close(failed.state);
    expect(step.state.phase).to.equal("closed");
    expect(ExercisePreviewPass_isPending(step.state)).to.equal(false);
    expect(ExercisePreviewPass_error(step.state)).to.equal(undefined);
  });

  it("cancels a scheduled write on close", () => {
    const scheduled = ExercisePreviewPass_textChanged(open(), "Squat / 5x3 / 16lb", true);
    expect(ExercisePreviewPass_close(scheduled.state).effects).to.deep.equal([{ type: "cancel" }]);
  });
});
