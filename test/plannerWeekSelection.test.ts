import "mocha";
import { expect } from "chai";
import {
  PlannerWeekSelection_index,
  PlannerWeekSelection_tabs,
} from "../src/pages/planner/models/plannerWeekSelection";
import { PlannerProgram_evaluate, PlannerProgram_evaluateText } from "../src/pages/planner/models/plannerProgram";
import { Settings_build } from "../src/models/settings";

describe("PlannerWeekSelection_index", () => {
  it("keeps an index that exists", () => {
    expect(PlannerWeekSelection_index(3, 1)).to.equal(1);
  });

  it("falls back to the last week after a later week was deleted", () => {
    expect(PlannerWeekSelection_index(2, 4)).to.equal(1);
  });

  it("never goes below the first week", () => {
    expect(PlannerWeekSelection_index(0, 0)).to.equal(0);
    expect(PlannerWeekSelection_index(2, -1)).to.equal(0);
  });
});

describe("PlannerWeekSelection_tabs", () => {
  it("marks a week whose day has an error", () => {
    const weeks = PlannerProgram_evaluateText("# Week 1\n## Day 1\nSquat / 3x5\n\n# Week 2\n## Day 1\nSquat / 3x");
    const planner = { vtype: "planner" as const, name: "P", weeks };
    const evaluated = PlannerProgram_evaluate(planner, Settings_build()).evaluatedWeeks;
    expect(PlannerWeekSelection_tabs(weeks, evaluated)).to.deep.equal([
      { name: "Week 1", isInvalid: false },
      { name: "Week 2", isInvalid: true },
    ]);
  });

  it("treats a week with no evaluation yet as valid", () => {
    const weeks = PlannerProgram_evaluateText("# Week 1\n## Day 1\nSquat / 3x5");
    expect(PlannerWeekSelection_tabs(weeks, [])).to.deep.equal([{ name: "Week 1", isInvalid: false }]);
  });
});
