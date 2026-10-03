import "mocha";
import { expect } from "chai";
import {
  PlannerProgram_evaluateText,
  PlannerProgram_parseText,
} from "../src/pages/planner/models/plannerProgram";

describe("PlannerProgram_parseText", () => {
  it("splits complete text into weeks and days", () => {
    const result = PlannerProgram_parseText("# Week 1\n## Day 1\nSquat / 3x5\n## Day 2\nBench Press / 3x5");
    expect(result.success).to.equal(true);
    if (result.success) {
      expect(result.data[0].days.map((d) => d.exerciseText)).to.deep.equal(["Squat / 3x5", "Bench Press / 3x5"]);
    }
  });

  it("still parses text whose exercise lines have errors", () => {
    const result = PlannerProgram_parseText("# Week 1\n## Day 1\nSquat / 3x\nNot An Exercise / 3x5");
    expect(result.success).to.equal(true);
    if (result.success) {
      expect(result.data[0].days[0].exerciseText).to.equal("Squat / 3x\nNot An Exercise / 3x5");
    }
  });

  it("gives the default week for empty text", () => {
    const result = PlannerProgram_parseText("");
    expect(result).to.deep.equal({ success: true, data: [{ name: "Week 1", days: [{ name: "Day 1", exerciseText: "" }] }] });
  });

  it("reports a day before any week at the day's line", () => {
    const result = PlannerProgram_parseText("## Day 1\nSquat / 3x5");
    expect(result.success).to.equal(false);
    if (!result.success) {
      expect(result.error.details.type).to.equal("dayWithoutWeek");
      expect(result.error.line).to.equal(1);
    }
  });

  it("reports an exercise before any day at the exercise's line", () => {
    const result = PlannerProgram_parseText("# Week 1\nSquat / 3x5\n## Day 1\nBench Press / 3x5");
    expect(result.success).to.equal(false);
    if (!result.success) {
      expect(result.error.details.type).to.equal("exerciseWithoutDay");
      expect(result.error.line).to.equal(2);
    }
  });

  it("reports a pasted list with no headings instead of dropping it", () => {
    const result = PlannerProgram_parseText("Squat / 3x5\nBench Press / 3x5");
    expect(result.success).to.equal(false);
    if (!result.success) {
      expect(result.error.details.type).to.equal("exerciseWithoutDay");
    }
  });
});

describe("PlannerProgram_evaluateText", () => {
  it("keeps dropping exercises outside a day, for callers that have not moved to parseText", () => {
    const weeks = PlannerProgram_evaluateText("# Week 1\nSquat / 3x5\n## Day 1\nBench Press / 3x5");
    expect(weeks[0].days.map((d) => d.exerciseText)).to.deep.equal(["Bench Press / 3x5"]);
  });
});
