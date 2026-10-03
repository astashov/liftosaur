import "mocha";
import { expect } from "chai";
import { PlannerUiClamp_apply } from "../src/pages/planner/models/plannerUiClamp";
import { IPlannerUi } from "../src/pages/planner/models/types";
import { IPlannerProgram } from "../src/types";

function plannerOf(weeks: string[][]): IPlannerProgram {
  return {
    vtype: "planner",
    name: "P",
    weeks: weeks.map((days, i) => ({
      name: `Week ${i + 1}`,
      days: days.map((name) => ({ name, exerciseText: "Squat / 3x5" })),
    })),
  };
}

function uiOf(over: Partial<IPlannerUi> = {}): IPlannerUi {
  return {
    weekIndex: 2,
    exerciseUi: { edit: new Set(), collapsed: new Set() },
    dayUi: { collapsed: new Set(["2-1"]) },
    focusedExercise: { weekIndex: 2, dayIndex: 1, exerciseLine: 1 },
    ...over,
  };
}

const threeWeeks = plannerOf([["A", "B"], ["A", "B"], ["A", "B"]]);

describe("PlannerUiClamp_apply", () => {
  it("keeps the same object when the structure did not change", () => {
    const ui = uiOf();
    const edited = plannerOf([["A", "B"], ["A", "B"], ["A", "B"]]);
    edited.weeks[0].days[0].exerciseText = "Bench Press / 3x5";
    expect(PlannerUiClamp_apply(ui, threeWeeks, edited)).to.equal(ui);
  });

  it("clamps the week tab and clears positions after the last week is deleted", () => {
    const result = PlannerUiClamp_apply(uiOf(), threeWeeks, plannerOf([["A", "B"], ["A", "B"]]));
    expect(result.weekIndex).to.equal(1);
    expect(result.focusedExercise).to.equal(undefined);
    expect(result.dayUi.collapsed.size).to.equal(0);
  });

  it("clears positions after days move inside a week", () => {
    const result = PlannerUiClamp_apply(uiOf(), threeWeeks, plannerOf([["A", "B"], ["A", "B"], ["B", "A"]]));
    expect(result.weekIndex).to.equal(2);
    expect(result.focusedExercise).to.equal(undefined);
    expect(result.dayUi.collapsed.size).to.equal(0);
  });

  it("keeps the week tab at zero when every week is gone", () => {
    const result = PlannerUiClamp_apply(uiOf(), threeWeeks, plannerOf([]));
    expect(result.weekIndex).to.equal(0);
  });
});
