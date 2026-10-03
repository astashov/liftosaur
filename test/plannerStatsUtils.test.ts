import "mocha";
import { expect } from "chai";
import {
  PlannerStatsUtils_formatDuration,
  PlannerStatsUtils_programSummary,
  PlannerStatsUtils_summary,
} from "../src/pages/planner/models/plannerStatsUtils";
import { PlannerProgram_evaluate, PlannerProgram_evaluateText } from "../src/pages/planner/models/plannerProgram";
import { Settings_build } from "../src/models/settings";

const settings = Settings_build();

function daysOf(text: string): ReturnType<typeof PlannerProgram_evaluate>["evaluatedWeeks"][number] {
  const planner = { vtype: "planner" as const, name: "P", weeks: PlannerProgram_evaluateText(text) };
  return PlannerProgram_evaluate(planner, settings).evaluatedWeeks[0];
}

describe("PlannerStatsUtils_summary", () => {
  it("counts exercises per day and averages the time", () => {
    const days = daysOf("# Week 1\n## Day 1\nSquat / 3x5\nBench Press / 3x5\n## Day 2\nDeadlift / 1x5\nBench Press / 3x5");
    const summary = PlannerStatsUtils_summary(days, settings);
    expect(summary.days).to.equal(2);
    expect(summary.exercisesPerDay).to.equal(2);
    expect(summary.approxTimeMs).to.be.greaterThan(0);
  });

  it("skips days with errors in the averages but still counts them as days", () => {
    const days = daysOf("# Week 1\n## Day 1\nSquat / 3x5\n## Day 2\nDeadlift / 1x");
    const summary = PlannerStatsUtils_summary(days, settings);
    expect(summary.days).to.equal(2);
    expect(summary.exercisesPerDay).to.equal(1);
  });

  it("returns zeros when no day evaluates", () => {
    const summary = PlannerStatsUtils_summary(daysOf("# Week 1\n## Day 1\nSquat / 3x"), settings);
    expect(summary).to.deep.equal({ days: 1, exercisesPerDay: 0, approxTimeMs: 0 });
  });
});

describe("PlannerStatsUtils_programSummary", () => {
  it("uses the longest week for days per week and averages exercises over every day", () => {
    const planner = {
      vtype: "planner" as const,
      name: "P",
      weeks: PlannerProgram_evaluateText(
        "# Week 1\n## Day 1\nSquat / 3x5\n## Day 2\nBench Press / 3x5\n## Day 3\nDeadlift / 1x5\n\n# Week 2\n## Day 1\nSquat / 3x5\nBench Press / 3x5"
      ),
    };
    const weeks = PlannerProgram_evaluate(planner, settings).evaluatedWeeks;
    const summary = PlannerStatsUtils_programSummary(weeks, settings);
    expect(summary.daysPerWeek).to.equal(3);
    expect(summary.days).to.equal(4);
    expect(summary.exercisesPerDay).to.equal(1);
  });
});

describe("PlannerStatsUtils_formatDuration", () => {
  it("prints minutes, hours, and both", () => {
    expect(PlannerStatsUtils_formatDuration(35 * 60000)).to.equal("35m");
    expect(PlannerStatsUtils_formatDuration(60 * 60000)).to.equal("1h");
    expect(PlannerStatsUtils_formatDuration(65 * 60000 + 20000)).to.equal("1h 5m");
    expect(PlannerStatsUtils_formatDuration(0)).to.equal("0m");
  });
});
