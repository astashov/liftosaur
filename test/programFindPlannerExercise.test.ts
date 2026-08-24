import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Program_findPlannerExercise } from "../src/models/program";
import { Settings_build } from "../src/models/settings";
import type { IPlannerProgram, ISettings } from "../src/types";

const settings: ISettings = Settings_build();

function plannerOf(text: string): IPlannerProgram {
  const { program } = PlannerTestUtils_get(text);
  if (program.planner == null) {
    throw new Error("expected a planner program");
  }
  return program.planner;
}

// The planner a caller has just folded its editor text into — not one parsed from scratch, since
// that is the case the resolver exists for.
function withDayText(planner: IPlannerProgram, week: number, dayInWeek: number, text: string): IPlannerProgram {
  return {
    ...planner,
    weeks: planner.weeks.map((w, wi) =>
      wi !== week - 1
        ? w
        : { ...w, days: w.days.map((d, di) => (di !== dayInWeek - 1 ? d : { ...d, exerciseText: text })) }
    ),
  };
}

describe("Program_findPlannerExercise", () => {
  it("finds an exercise wherever in the program it is declared", () => {
    const planner = plannerOf("# Week 1\n## Day 1\nSquat / 3x8 / 100lb\n## Day 2\nBench Press / 3x8 / 80lb\n");
    expect(Program_findPlannerExercise(planner, settings, "Squat")?.fullName).to.equal("Squat");
    expect(Program_findPlannerExercise(planner, settings, "Bench Press")?.fullName).to.equal("Bench Press");
    expect(Program_findPlannerExercise(planner, settings, "Deadlift")).to.equal(undefined);
  });

  // The point of resolving against the folded planner rather than the caller's last evaluation:
  // a rename that has only been typed has already moved the key.
  it("resolves a name that only exists in the folded planner", () => {
    const planner = plannerOf("# Week 1\n## Day 1\nSquat / 3x8 / 100lb\n");
    const folded = withDayText(planner, 1, 1, "Bench Press / 3x8 / 100lb");
    expect(Program_findPlannerExercise(folded, settings, "Bench Press")).to.not.equal(undefined);
    expect(Program_findPlannerExercise(folded, settings, "Squat")).to.equal(undefined);
  });

  // A whole-document parse is all-or-nothing, so resolving through one would take the action away
  // from every line in the program because of an unfinished one somewhere else.
  it("still resolves other days when one day doesn't parse", () => {
    const planner = plannerOf("# Week 1\n## Day 1\nSquat / 3x8 / 100lb\n## Day 2\nBench Press / 3x8 / 80lb\n");
    const broken = withDayText(planner, 1, 2, "Bench Press / 3x8 / 80lb / progress: lp(");
    expect(Program_findPlannerExercise(broken, settings, "Squat")).to.not.equal(undefined);
    expect(Program_findPlannerExercise(broken, settings, "Bench Press")).to.equal(undefined);
  });
});
