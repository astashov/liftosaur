import "mocha";
import { expect } from "chai";
import { WorkoutMenuActions_list } from "../src/utils/workoutMenuActions";

describe("WorkoutMenuActions", () => {
  it("lists safe cancellation and destructive deletion for an ongoing program workout", () => {
    const actions = WorkoutMenuActions_list({
      isCurrent: true,
      hasNonEmptyProgram: true,
      hasNonEmptyCurrentProgram: true,
      isInAnyProgram: true,
    });
    expect(actions).to.eql(["editDay", "muscles", "notes", "tour", "cancel", "delete"]);
  });

  it("adds share for a past workout and create program day when no program owns it", () => {
    const actions = WorkoutMenuActions_list({
      isCurrent: false,
      hasNonEmptyProgram: false,
      hasNonEmptyCurrentProgram: false,
      isInAnyProgram: false,
    });
    expect(actions).to.eql(["notes", "share", "createProgramDay", "tour", "delete"]);
  });

  it("drops edit day when the program is no longer among the user's programs", () => {
    const actions = WorkoutMenuActions_list({
      isCurrent: true,
      hasNonEmptyProgram: true,
      hasNonEmptyCurrentProgram: false,
      isInAnyProgram: true,
    });
    expect(actions).to.eql(["muscles", "notes", "tour", "cancel", "delete"]);
  });
});
