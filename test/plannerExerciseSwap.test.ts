import "mocha";
import { expect } from "chai";
import { PlannerExerciseSwap_openByKey } from "../src/pages/planner/models/plannerExerciseSwap";
import { PlannerProgram_evaluateText } from "../src/pages/planner/models/plannerProgram";
import { IPlannerState } from "../src/pages/planner/models/types";
import { Program_create } from "../src/models/program";
import { Settings_build } from "../src/models/settings";

const settings = Settings_build();

function stateOf(text: string): IPlannerState {
  const planner = { vtype: "planner" as const, name: "P", weeks: PlannerProgram_evaluateText(text) };
  return {
    id: "p",
    current: { program: { ...Program_create("P", "p"), planner } },
    ui: { weekIndex: 0, exerciseUi: { edit: new Set(), collapsed: new Set() }, dayUi: { collapsed: new Set() } },
    history: { past: [], future: [] },
  };
}

const text = "# Week 1\n## Day 1\nSquat / 3x5\n## Day 2\nBench Press / 3x5\n\n# Week 2\n## Day 1\nSquat / 3x5";

describe("PlannerExerciseSwap_openByKey", () => {
  it("asks how far to swap an exercise used in several places", () => {
    const state = PlannerExerciseSwap_openByKey(stateOf(text), settings, { week: 1, dayInWeek: 1 }, "squat_barbell");
    expect(state.ui.editExerciseModal?.plannerExercise.name).to.equal("Squat");
    expect(state.ui.exercisePicker).to.equal(undefined);
  });

  it("opens the picker for a single exercise, swapping that one", () => {
    const dayData = { week: 1, dayInWeek: 2 };
    const state = PlannerExerciseSwap_openByKey(stateOf(text), settings, dayData, "benchpress_barbell");
    expect(state.ui.exercisePicker?.change).to.equal("one");
    expect(state.ui.exercisePicker?.exerciseKey).to.equal("benchpress_barbell");
    expect(state.ui.exercisePicker?.dayData).to.deep.equal(dayData);
    expect(state.ui.editExerciseModal).to.equal(undefined);
  });

  it("leaves the state alone when the exercise is not in the program", () => {
    const initial = stateOf(text);
    const state = PlannerExerciseSwap_openByKey(initial, settings, { week: 1, dayInWeek: 1 }, "deadlift_barbell");
    expect(state).to.equal(initial);
  });
});
