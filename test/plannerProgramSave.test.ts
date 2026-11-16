import "mocha";
import { expect } from "chai";
import {
  PlannerProgramSave_baseAfterSave,
  PlannerProgramSave_capabilities,
  PlannerProgramSave_friendRequest,
  PlannerProgramSave_initialBase,
  PlannerProgramSave_target,
} from "../src/pages/planner/models/plannerProgramSave";
import { Settings_build } from "../src/models/settings";
import { Program_create } from "../src/models/program";
import { PlannerProgram_evaluateText } from "../src/pages/planner/models/plannerProgram";

describe("PlannerProgramSave", () => {
  const planner = { vc: { phone: 2 }, t: 200 };
  const storage = { _versions: { programs: { items: { 42: { planner } } } } };

  it("starts from the planner clock the page loaded", () => {
    expect(PlannerProgramSave_initialBase(storage, { clonedAt: 42 })).to.deep.equal(planner);
    expect(PlannerProgramSave_initialBase(storage, undefined)).to.equal(undefined);
    expect(PlannerProgramSave_initialBase(undefined, { clonedAt: 42 })).to.equal(undefined);
  });

  it("moves to the clock the server returned, and keeps the old one when it returned none", () => {
    const next = { vc: { web: 1, phone: 2 }, t: 300 };
    expect(PlannerProgramSave_baseAfterSave(planner, { plannerVersion: next })).to.deep.equal(next);
    expect(PlannerProgramSave_baseAfterSave(planner, {})).to.deep.equal(planner);
  });

  describe("editing a friend's program", () => {
    const friend = { ownerId: "sam", nickname: "Sam", base: "b1", settings: Settings_build() };

    it("saves to the friend's account, and to the user's own otherwise", () => {
      expect(PlannerProgramSave_target(friend)).to.eql({ kind: "friend", ownerId: "sam", loadedBase: "b1" });
      expect(PlannerProgramSave_target(undefined)).to.eql({ kind: "own" });
    });

    it("turns off settings saves, renaming, sharing and custom exercises", () => {
      const own = PlannerProgramSave_capabilities(true, undefined);
      expect(own).to.eql({ canSaveSettings: true, canRename: true, canShare: true });
      expect(PlannerProgramSave_capabilities(false, undefined).canSaveSettings).to.equal(false);

      const coach = PlannerProgramSave_capabilities(true, friend);
      expect(coach).to.deep.include({ canSaveSettings: false, canRename: false, canShare: false });
      expect(coach.otherAccountWarning).to.contain("Sam's program, not yours");
      expect(own.otherAccountWarning).to.equal(undefined);
      expect(coach.customExercisesLockedReason).to.contain("Sam's account");
      expect(PlannerProgramSave_capabilities(true, { ...friend, nickname: undefined }).otherAccountWarning).to.contain(
        "your friend's program"
      );
    });

    it("sends the program text with the base the page loaded", () => {
      const weeks = PlannerProgram_evaluateText("# Week 1\n## Day 1\nSquat / 3x5 / 100lb\n");
      const program = { ...Program_create("Strength", "p1"), planner: { vtype: "planner" as const, name: "S", weeks } };
      const request = PlannerProgramSave_friendRequest(program, "b2");
      expect(request.programId).to.equal("p1");
      expect(request.base).to.equal("b2");
      expect(request.text).to.contain("Squat / 3x5 / 100lb");
    });
  });
});
