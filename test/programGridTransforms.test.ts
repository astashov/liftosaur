import "mocha";
import { expect } from "chai";
import {
  ProgramGridTransforms_setRepeatRange,
  ProgramGridTransforms_deleteDayRow,
  ProgramGridTransforms_duplicateDayRow,
} from "../src/pages/planner/models/programGridTransforms";
import { PlannerProgram_evaluateText } from "../src/pages/planner/models/plannerProgram";
import { ProgramGrid_build } from "../src/pages/planner/models/programGrid";
import { Program_evaluate, Program_create } from "../src/models/program";
import { Settings_build } from "../src/models/settings";
import { IPlannerProgram, IProgram } from "../src/types";

function plannerOf(text: string): IPlannerProgram {
  return { vtype: "planner", name: "P", weeks: PlannerProgram_evaluateText(text) };
}

function dayTexts(planner: IPlannerProgram): string[] {
  return planner.weeks.map((w) => (w.days[0]?.exerciseText ?? "").trim());
}

function spans(planner: IPlannerProgram, name: string): string[] {
  const program: IProgram = { ...Program_create("P"), planner };
  const grid = ProgramGrid_build(Program_evaluate(program, Settings_build()), Settings_build());
  return grid.placements.filter((p) => p.fullName === name).map((p) => `[${p.colStart}-${p.colEnd}]`);
}

const FOUR_WEEKS = `# Week 1
## Day 1
Squat[1-2] / 3x5 100lb
Bench Press / 5x5 50lb

# Week 2
## Day 1
Bench Press / 5x5 50lb

# Week 3
## Day 1
Bench Press / 5x5 50lb

# Week 4
## Day 1
Bench Press / 5x5 50lb
`;

describe("ProgramGridTransforms", () => {
  it("extends a repeat by rewriting its range, touching no other line", () => {
    const next = ProgramGridTransforms_setRepeatRange(plannerOf(FOUR_WEEKS), { week: 1, dayInWeek: 1 }, "Squat", 4);
    expect(dayTexts(next)[0]).to.equal("Squat[1-4] / 3x5 100lb\nBench Press / 5x5 50lb");
    // The weeks it now covers hold no text of their own — the evaluator synthesizes them.
    expect(dayTexts(next).slice(1)).to.deep.equal([
      "Bench Press / 5x5 50lb",
      "Bench Press / 5x5 50lb",
      "Bench Press / 5x5 50lb",
    ]);
    expect(spans(next, "Squat")).to.deep.equal(["[0-3]"]);
  });

  it("shrinks a repeat", () => {
    const next = ProgramGridTransforms_setRepeatRange(plannerOf(FOUR_WEEKS), { week: 1, dayInWeek: 1 }, "Squat", 3);
    expect(dayTexts(next)[0]).to.equal("Squat[1-3] / 3x5 100lb\nBench Press / 5x5 50lb");
    expect(spans(next, "Squat")).to.deep.equal(["[0-2]"]);
  });

  it("drops the repeat entirely when shrunk to its own week", () => {
    const next = ProgramGridTransforms_setRepeatRange(plannerOf(FOUR_WEEKS), { week: 1, dayInWeek: 1 }, "Squat", 1);
    expect(dayTexts(next)[0]).to.equal("Squat / 3x5 100lb\nBench Press / 5x5 50lb");
    expect(spans(next, "Squat")).to.deep.equal(["[0-0]"]);
  });

  it("adds a repeat to an exercise that had none", () => {
    const next = ProgramGridTransforms_setRepeatRange(
      plannerOf(FOUR_WEEKS),
      { week: 1, dayInWeek: 1 },
      "Bench Press",
      2
    );
    expect(dayTexts(next)[0]).to.equal("Squat[1-2] / 3x5 100lb\nBench Press[1-2] / 5x5 50lb");
  });

  it("never deletes another exercise while shrinking - the bug in changeCurrentInstance's sibling", () => {
    const sparse = `# Week 1
## Day 1
Squat[1-2] / 3x5 100lb
Bench Press / 5x5 50lb

# Week 2
## Day 1
Bench Press / 5x5 50lb

# Week 3
## Day 1
Bench Press / 5x5 50lb
`;
    const next = ProgramGridTransforms_setRepeatRange(plannerOf(sparse), { week: 1, dayInWeek: 1 }, "Squat", 1);
    expect(spans(next, "Bench Press")).to.deep.equal(["[0-2]"]);
  });

  it("keeps a forced order when the range changes", () => {
    const ordered = `# Week 1
## Day 1
Squat[3,1-2] / 3x5 100lb

# Week 2
## Day 1

# Week 3
## Day 1
`;
    const next = ProgramGridTransforms_setRepeatRange(plannerOf(ordered), { week: 1, dayInWeek: 1 }, "Squat", 3);
    expect(dayTexts(next)[0]).to.equal("Squat[3,1-3] / 3x5 100lb");
  });

  it("extending across a week that defines the exercise itself leaves that week as an override", () => {
    const overridden = `# Week 1
## Day 1
Squat[1-2] / 3x5 100lb

# Week 2
## Day 1

# Week 3
## Day 1
Squat / 5x3 200lb

# Week 4
## Day 1
`;
    const next = ProgramGridTransforms_setRepeatRange(plannerOf(overridden), { week: 1, dayInWeek: 1 }, "Squat", 4);
    expect(dayTexts(next)[0]).to.equal("Squat[1-4] / 3x5 100lb");
    expect(dayTexts(next)[2]).to.equal("Squat / 5x3 200lb");
    expect(spans(next, "Squat")).to.deep.equal(["[0-1]", "[2-2]", "[3-3]"]);
  });

  describe("deleteDayRow", () => {
    const THREE_DAYS = `# Week 1
## Day 1
main / used: none / 3x5 100lb

## Day 2
Squat[1-2] / 3x5 100lb

## Day 3
Bench Press / ...main[1]
Deadlift / 1x5 200lb

# Week 2
## Day 1
main / used: none / 3x5 110lb

## Day 2

## Day 3
Bench Press / ...main[1]
Deadlift / 1x5 210lb
`;

    it("removes the day from every week, not just one", () => {
      const result = ProgramGridTransforms_deleteDayRow(plannerOf(THREE_DAYS), 1, Settings_build());
      expect(result.ok).to.equal(true);
      if (!result.ok) {
        return;
      }
      expect(result.planner.weeks.map((w) => w.days.length)).to.deep.equal([2, 2]);
      expect(result.planner.weeks[0].days.map((d) => d.name)).to.deep.equal(["Day 1", "Day 3"]);
      expect(spans(result.planner, "Squat")).to.deep.equal([]);
      // Everything that survived still resolves — the reuse of day 1 is untouched. Both weeks say
      // the same thing, so it reads as one run.
      expect(spans(result.planner, "Bench Press")).to.deep.equal(["[0-1]"]);
    });

    it("refuses when another day reuses the one being deleted", () => {
      const result = ProgramGridTransforms_deleteDayRow(plannerOf(THREE_DAYS), 0, Settings_build());
      expect(result.ok).to.equal(false);
      if (result.ok) {
        return;
      }
      // Day 1 is what the others reuse, so it refuses instead of orphaning them.
      expect(result.reason).to.contain("reuses this day");
    });

    it("shifts a qualifier down when an earlier day is removed", () => {
      const text = `# Week 1
## Day 1
Squat / 3x5 100lb

## Day 2
main / used: none / 3x5 100lb

## Day 3
Bench Press / ...main[2]

# Week 2
## Day 1
Squat / 3x5 100lb

## Day 2
main / used: none / 3x5 110lb

## Day 3
Bench Press / ...main[2]
`;
      const result = ProgramGridTransforms_deleteDayRow(plannerOf(text), 0, Settings_build());
      expect(result.ok).to.equal(true);
      if (!result.ok) {
        return;
      }
      expect(result.planner.weeks[0].days[1].exerciseText.trim()).to.equal("Bench Press / ...main[1]");
      expect(spans(result.planner, "Bench Press")).to.deep.equal(["[0-1]"]);
    });
  });

  describe("duplicateDayRow", () => {
    it("appends a copy to every week without moving any existing slot", () => {
      const text = `# Week 1
## Day 1
Squat[1-2] / 3x5 100lb

## Day 2
Bench Press / 5x5 50lb

# Week 2
## Day 1

## Day 2
Bench Press / 5x5 50lb
`;
      const result = ProgramGridTransforms_duplicateDayRow(plannerOf(text), 1, Settings_build());
      expect(result.ok).to.equal(true);
      if (!result.ok) {
        return;
      }
      expect(result.planner.weeks.map((w) => w.days.length)).to.deep.equal([3, 3]);
      expect(result.planner.weeks[0].days[2].exerciseText.trim()).to.equal("Bench Press / 5x5 50lb");
      // The repeat on day 1 is untouched, which is the point of appending.
      expect(spans(result.planner, "Squat")).to.deep.equal(["[0-1]"]);
    });
  });

  it("leaves the program alone when the exercise isn't on that day", () => {
    const planner = plannerOf(FOUR_WEEKS);
    expect(ProgramGridTransforms_setRepeatRange(planner, { week: 1, dayInWeek: 1 }, "Deadlift", 3)).to.equal(planner);
  });
});
