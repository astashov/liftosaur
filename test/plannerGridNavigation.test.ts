import "mocha";
import { expect } from "chai";
import { ILensRecordingPayload } from "lens-shmens";
import { PlannerGridNavigation_create } from "../src/pages/planner/models/plannerGridNavigation";
import { PlannerProgram_evaluateText } from "../src/pages/planner/models/plannerProgram";
import { ProgramGrid_build } from "../src/pages/planner/models/programGrid";
import { IPlannerState } from "../src/pages/planner/models/types";
import { Program_create, Program_evaluate } from "../src/models/program";
import { Settings_build } from "../src/models/settings";

const settings = Settings_build();
const planner = {
  vtype: "planner" as const,
  name: "P",
  weeks: PlannerProgram_evaluateText(
    "# Week 1\n## Day 1\nSquat / 3x5\n## Day 2\nBench Press / 3x5\n\n# Week 2\n## Day 1\nSquat / 3x5\n## Day 2\nDeadlift / 1x5"
  ),
};
const program = { ...Program_create("P", "p"), planner };
const evaluatedProgram = Program_evaluate(program, settings);
const grid = ProgramGrid_build(evaluatedProgram, settings);

function initialState(): IPlannerState {
  return {
    id: "p",
    current: { program },
    ui: {
      mode: "grid",
      weekIndex: 0,
      exerciseUi: { edit: new Set(), collapsed: new Set() },
      dayUi: { collapsed: new Set(["1-1", "0-0"]) },
    },
    history: { past: [], future: [] },
  };
}

function run(act: (nav: ReturnType<typeof PlannerGridNavigation_create>) => void): IPlannerState {
  let state = initialState();
  const dispatch = (
    recording: ILensRecordingPayload<IPlannerState> | ILensRecordingPayload<IPlannerState>[]
  ): void => {
    for (const r of Array.isArray(recording) ? recording : [recording]) {
      state = r.fn(state);
    }
  };
  act(PlannerGridNavigation_create({ grid, evaluatedProgram, settings, plannerDispatch: dispatch }));
  return state;
}

describe("PlannerGridNavigation_create", () => {
  it("offers no exercise Edit, so Reorder never jumps to By Weeks", () => {
    let nav: ReturnType<typeof PlannerGridNavigation_create> | undefined;
    run((n) => {
      nav = n;
    });
    expect(nav?.onEditPlacement).to.equal(undefined);
  });

  it("Swap on an exercise used in several places asks how far to swap", () => {
    const squat = grid.placements.find((p) => p.fullName.startsWith("Squat"))!;
    const state = run((nav) => nav.onSwapPlacement(squat));
    expect(state.ui.editExerciseModal?.plannerExercise.name).to.equal("Squat");
    expect(state.ui.exercisePicker).to.equal(undefined);
  });

  it("Swap on a single exercise opens the picker for that one", () => {
    const bench = grid.placements.find((p) => p.fullName.startsWith("Bench Press"))!;
    const state = run((nav) => nav.onSwapPlacement(bench));
    expect(state.ui.exercisePicker?.change).to.equal("one");
    expect(state.ui.exercisePicker?.dayData).to.deep.equal({ week: 1, dayInWeek: 2, day: 2 });
  });

  it("Add opens the picker for that day slot", () => {
    const state = run((nav) => nav.onAddExercise(1, 0));
    expect(state.ui.exercisePicker?.dayData).to.deep.equal({ week: 2, dayInWeek: 1 });
    expect(state.ui.exercisePicker?.exerciseKey).to.equal(undefined);
  });

  it("stats buttons switch the side panel tab and open it", () => {
    const state = run((nav) => nav.onShowDayStats(1));
    expect(state.ui.sidePanelTab).to.equal("day");
    expect(state.ui.sidePanelOpen).to.equal(true);
  });
});
