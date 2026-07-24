import "mocha";
import { expect } from "chai";
import { PlannerStateVars_fromArgs } from "../src/pages/planner/models/plannerStateVars";

describe("PlannerStateVars_fromArgs", () => {
  it("parses valid key:value args", () => {
    const result = PlannerStateVars_fromArgs(["weight: 100lb", "reps: 5"]);
    expect(result.state.weight).to.deep.equal({ value: 100, unit: "lb" });
    expect(result.state.reps).to.equal(5);
  });

  it("does not crash on args missing a colon", () => {
    const result = PlannerStateVars_fromArgs(["incomplete"]);
    expect(result.state).to.deep.equal({});
  });

  it("does not crash on empty string args", () => {
    const result = PlannerStateVars_fromArgs([""]);
    expect(result.state).to.deep.equal({});
  });

  it("skips invalid args and parses valid ones", () => {
    const result = PlannerStateVars_fromArgs(["bad", "good: 10"]);
    expect(result.state.good).to.equal(10);
    expect(Object.keys(result.state)).to.have.lengthOf(1);
  });
});
