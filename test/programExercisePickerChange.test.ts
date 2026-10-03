import "mocha";
import { expect } from "chai";
import { ProgramExercisePickerChange_apply } from "../src/models/programExercisePickerChange";
import { PlannerProgram_evaluateText } from "../src/pages/planner/models/plannerProgram";
import { Program_create, Program_evaluate, Program_getProgramExerciseForKeyAndShortDayData } from "../src/models/program";
import { Settings_build } from "../src/models/settings";
import { IPlannerProgram } from "../src/types";

const settings = Settings_build();

function plannerOf(text: string): IPlannerProgram {
  return { vtype: "planner", name: "P", weeks: PlannerProgram_evaluateText(text) };
}

const planner = plannerOf("# Week 1\n## Day 1\nSquat / 3x5\n## Day 2\nSquat / 3x5\n\n# Week 2\n## Day 1\nSquat / 3x5");

function squatAt(week: number, dayInWeek: number): ReturnType<typeof Program_getProgramExerciseForKeyAndShortDayData> {
  const evaluated = Program_evaluate({ ...Program_create("P", "p"), planner }, settings);
  const key = evaluated.weeks[0].days[0].exercises[0].key;
  return Program_getProgramExerciseForKeyAndShortDayData(evaluated, { week, dayInWeek }, key);
}

function texts(result: IPlannerProgram): string[] {
  return result.weeks.flatMap((w) => w.days.map((d) => d.exerciseText.trim()));
}

const bench = { type: "adhoc" as const, exerciseType: { id: "benchPress" as const, equipment: "barbell" as const } };

describe("ProgramExercisePickerChange_apply", () => {
  it("returns nothing when no exercise was picked", () => {
    const result = ProgramExercisePickerChange_apply({
      planner,
      settings,
      selectedExercises: [],
      plannerExercise: squatAt(1, 1),
      dayData: { week: 1, dayInWeek: 1 },
      change: "one",
      variationIndex: undefined,
    });
    expect(result).to.equal(undefined);
  });

  it("replaces one instance and leaves the others", () => {
    const result = ProgramExercisePickerChange_apply({
      planner,
      settings,
      selectedExercises: [bench],
      plannerExercise: squatAt(1, 2),
      dayData: { week: 1, dayInWeek: 2 },
      change: "one",
      variationIndex: undefined,
    })!;
    expect(result.isAdd).to.equal(false);
    const all = texts(result.planner);
    expect(all[0]).to.contain("Squat");
    expect(all[1]).to.contain("Bench Press");
    expect(all[2]).to.contain("Squat");
  });

  it("replaces every instance and reports the new key", () => {
    const result = ProgramExercisePickerChange_apply({
      planner,
      settings,
      selectedExercises: [bench],
      plannerExercise: squatAt(1, 1),
      dayData: { week: 1, dayInWeek: 1 },
      change: "all",
      variationIndex: undefined,
    })!;
    expect(texts(result.planner).every((t) => t.includes("Bench Press"))).to.equal(true);
    expect(result.newKey).to.be.a("string");
  });

  it("adds every picked exercise as its own line to an empty day slot", () => {
    const result = ProgramExercisePickerChange_apply({
      planner,
      settings,
      selectedExercises: [bench, { type: "template", name: "Accessory" }],
      plannerExercise: undefined,
      dayData: { week: 2, dayInWeek: 1 },
      change: "all",
      variationIndex: undefined,
    })!;
    expect(result.isAdd).to.equal(true);
    const lines = result.planner.weeks[1].days[0].exerciseText.split("\n");
    expect(lines).to.have.length(3);
    expect(lines[1]).to.contain("Bench Press");
    expect(lines[2]).to.contain("Accessory / used: none");
    expect(result.description).to.equal("Add 2 exercises to exercise text");
  });

  it("refuses to add into a day that does not exist", () => {
    const result = ProgramExercisePickerChange_apply({
      planner,
      settings,
      selectedExercises: [bench],
      plannerExercise: undefined,
      dayData: { week: 2, dayInWeek: 5 },
      change: "all",
      variationIndex: undefined,
    });
    expect(result).to.equal(undefined);
  });

  it("does not change the planner it was given", () => {
    const before = JSON.stringify(planner);
    ProgramExercisePickerChange_apply({
      planner,
      settings,
      selectedExercises: [bench],
      plannerExercise: undefined,
      dayData: { week: 1, dayInWeek: 1 },
      change: "all",
      variationIndex: undefined,
    });
    expect(JSON.stringify(planner)).to.equal(before);
  });
});
