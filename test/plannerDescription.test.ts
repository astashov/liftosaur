import "mocha";
import { expect } from "chai";
import { PlannerDescription_afterBlur } from "../src/pages/planner/models/plannerDescription";

describe("PlannerDescription_afterBlur", () => {
  it("removes a description left empty, so the Add link comes back", () => {
    expect(PlannerDescription_afterBlur("")).to.equal(undefined);
    expect(PlannerDescription_afterBlur("  \n ")).to.equal(undefined);
  });

  it("keeps a description with text exactly as typed", () => {
    expect(PlannerDescription_afterBlur("Deload week\n")).to.equal("Deload week\n");
  });
});
