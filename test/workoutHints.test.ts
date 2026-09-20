import "mocha";
import { expect } from "chai";
import { WorkoutHints_isLearned, WorkoutHints_recordUse } from "../src/utils/workoutHints";

describe("WorkoutHints", () => {
  it("learns a one-use hint on the first use", () => {
    const helps = WorkoutHints_recordUse([], "workout-target-switch", "a");
    expect(helps).to.eql(["workout-target-switch.a", "workout-target-switch"]);
    expect(WorkoutHints_isLearned(helps, "workout-target-switch")).to.eql(true);
  });

  it("counts one stamp once, so a StrictMode double reducer run is not two uses", () => {
    const once = WorkoutHints_recordUse(["other"], "workout-reorder", "a");
    expect(WorkoutHints_recordUse(once, "workout-reorder", "a")).to.eql(once);
  });

  it("learns a two-use hint on the second use", () => {
    const once = WorkoutHints_recordUse(["other"], "workout-reorder", "a");
    expect(once).to.eql(["other", "workout-reorder.a"]);
    expect(WorkoutHints_isLearned(once, "workout-reorder")).to.eql(false);
    const twice = WorkoutHints_recordUse(once, "workout-reorder", "b");
    expect(twice).to.eql(["other", "workout-reorder.a", "workout-reorder.b", "workout-reorder"]);
    expect(WorkoutHints_isLearned(twice, "workout-reorder")).to.eql(true);
  });

  it("counts the same stamp once, so a reducer that runs twice does not double count", () => {
    const once = WorkoutHints_recordUse([], "workout-set-expand", "a");
    expect(WorkoutHints_recordUse(once, "workout-set-expand", "a")).to.equal(once);
    expect(WorkoutHints_isLearned(once, "workout-set-expand")).to.eql(false);
  });

  it("returns the same array once learned", () => {
    const helps = ["workout-set-expand.a", "workout-set-expand.b", "workout-set-expand"];
    expect(WorkoutHints_recordUse(helps, "workout-set-expand", "c")).to.equal(helps);
  });
});
