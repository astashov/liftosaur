import "mocha";
import { expect } from "chai";
import {
  PlannerProgramSave_baseAfterSave,
  PlannerProgramSave_initialBase,
} from "../src/pages/planner/models/plannerProgramSave";

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
});
