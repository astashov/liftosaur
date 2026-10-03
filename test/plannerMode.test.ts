import "mocha";
import { expect } from "chai";
import {
  PlannerMode_applyFullText,
  PlannerMode_canSwitch,
  PlannerMode_commitFullText,
  PlannerMode_current,
  PlannerMode_isStructureError,
  PlannerMode_isValid,
  PlannerMode_fullTextAfter,
  PlannerMode_outsideEditError,
  PlannerMode_switch,
} from "../src/pages/planner/models/plannerMode";
import { PlannerProgram_evaluate, PlannerProgram_evaluateFull } from "../src/pages/planner/models/plannerProgram";
import { IPlannerState } from "../src/pages/planner/models/types";
import { IPlannerProgram } from "../src/types";
import { Program_create } from "../src/models/program";
import { Settings_build } from "../src/models/settings";

const settings = Settings_build();

function plannerOf(weeks: IPlannerProgram["weeks"]): IPlannerProgram {
  return { vtype: "planner", name: "Test", weeks };
}

function stateOf(planner: IPlannerProgram, over: Partial<IPlannerState> = {}): IPlannerState {
  return {
    id: "test",
    current: { program: { ...Program_create("Test", "test"), planner } },
    ui: { weekIndex: 0, exerciseUi: { edit: new Set(), collapsed: new Set() }, dayUi: { collapsed: new Set() } },
    history: { past: [], future: [] },
    ...over,
  };
}

function fullStateOf(planner: IPlannerProgram, text: string): IPlannerState {
  const base = stateOf(planner);
  return { ...base, ui: { ...base.ui, mode: "full" }, fulltext: { text } };
}

const validPlanner = plannerOf([
  { name: "Week 1", days: [{ name: "Day 1", exerciseText: "Squat / 3x5" }] },
  { name: "Week 2", days: [{ name: "Day 1", exerciseText: "Bench Press / 3x5" }] },
]);

const invalidPlanner = plannerOf([{ name: "Week 1", days: [{ name: "Day 1", exerciseText: "Squat / 3x" }] }]);

function switched(state: IPlannerState, to: "grid" | "perday" | "full"): Pick<IPlannerState, "ui" | "fulltext"> {
  const result = PlannerMode_switch(state, to);
  if (!result.success) {
    throw new Error(`switch refused: ${result.error.message}`);
  }
  return result.data;
}

describe("PlannerMode", () => {
  it("treats a missing or app-only mode as By Weeks", () => {
    const state = stateOf(validPlanner);
    expect(PlannerMode_current(state.ui)).to.equal("perday");
    expect(PlannerMode_current({ ...state.ui, mode: "ui" })).to.equal("perday");
    expect(PlannerMode_current({ ...state.ui, mode: "grid" })).to.equal("grid");
  });

  it("builds the full text when entering Full Program", () => {
    const result = switched(stateOf(validPlanner), "full");
    expect(result.ui.mode).to.equal("full");
    expect(result.fulltext?.text).to.contain("# Week 1");
    expect(result.fulltext?.text).to.contain("Squat / 3x5");
  });

  it("enters Full Program even when a day has errors", () => {
    expect(switched(stateOf(invalidPlanner), "full").fulltext?.text).to.contain("Squat / 3x");
  });

  it("drops the full text when leaving Full Program", () => {
    const result = switched(fullStateOf(validPlanner, "# Week 1\n## Day 1\nSquat / 3x5"), "perday");
    expect(result.ui.mode).to.equal("perday");
    expect(result.fulltext).to.equal(undefined);
  });

  it("leaves Full Program when only exercise lines have errors", () => {
    const result = PlannerMode_switch(fullStateOf(validPlanner, "# Week 1\n## Day 1\nSquat / 3x"), "perday");
    expect(result.success).to.equal(true);
  });

  it("refuses to leave Full Program while a line sits outside any day", () => {
    const result = PlannerMode_switch(fullStateOf(validPlanner, "# Week 1\nSquat / 3x5"), "perday");
    expect(result.success).to.equal(false);
    if (!result.success) {
      expect(result.error.details.type).to.equal("exerciseWithoutDay");
      expect(result.error.line).to.equal(2);
    }
  });

  it("keeps the text when switching to the mode it is already in", () => {
    const result = switched(fullStateOf(validPlanner, "typed"), "full");
    expect(result.fulltext).to.deep.equal({ text: "typed" });
  });

  it("allows Reorder only when every day evaluates", () => {
    const valid = PlannerProgram_evaluate(validPlanner, settings).evaluatedWeeks;
    const invalid = PlannerProgram_evaluate(invalidPlanner, settings).evaluatedWeeks;
    expect(PlannerMode_canSwitch(valid, "grid")).to.equal(true);
    expect(PlannerMode_canSwitch(invalid, "grid")).to.equal(false);
    expect(PlannerMode_canSwitch(invalid, "perday")).to.equal(true);
  });

  it("judges validity by the full text while in Full Program", () => {
    const valid = PlannerProgram_evaluate(validPlanner, settings).evaluatedWeeks;
    const brokenFull = PlannerProgram_evaluateFull("# Week 1\nSquat / 3x5", settings).evaluatedWeeks;
    expect(PlannerMode_isValid(valid)).to.equal(true);
    expect(PlannerMode_isValid(valid, brokenFull)).to.equal(false);
  });
});

describe("PlannerMode_commitFullText", () => {
  it("returns weeks and no error for valid text", () => {
    const commit = PlannerMode_commitFullText("# Week 1\n## Day 1\nSquat / 3x5", settings);
    expect(commit.weeks?.[0].days[0].exerciseText).to.equal("Squat / 3x5");
    expect(commit.error).to.equal(undefined);
  });

  it("returns weeks and the exercise error for text with a bad exercise line", () => {
    const commit = PlannerMode_commitFullText("# Week 1\n## Day 1\nSquat / 3x", settings);
    expect(commit.weeks?.[0].days[0].exerciseText).to.equal("Squat / 3x");
    expect(commit.error).to.not.equal(undefined);
    expect(PlannerMode_isStructureError(commit.error)).to.equal(false);
  });

  it("returns no weeks and a structure error for a pasted list", () => {
    const commit = PlannerMode_commitFullText("Squat / 3x5\nBench Press / 3x5", settings);
    expect(commit.weeks).to.equal(undefined);
    expect(PlannerMode_isStructureError(commit.error)).to.equal(true);
  });
});

describe("PlannerMode_applyFullText", () => {
  it("keeps the typed text and commits the weeks when the structure parses", () => {
    const state = fullStateOf(validPlanner, "");
    const text = "# Week 1\n## Day A\nSquat / 3x\n\n# Week 2\n## Day B\nDeadlift / 1x5";
    const next = PlannerMode_applyFullText(state, text);
    expect(next.fulltext?.text).to.equal(text);
    expect(next.current.program.planner?.weeks.map((w) => w.days[0].name)).to.deep.equal(["Day A", "Day B"]);
    expect(next.current.program.planner?.name).to.equal("Test");
  });

  it("keeps the typed text but not the weeks when a line is outside any day", () => {
    const state = fullStateOf(validPlanner, "");
    const next = PlannerMode_applyFullText(state, "Squat / 3x5");
    expect(next.fulltext?.text).to.equal("Squat / 3x5");
    expect(next.current.program.planner).to.equal(validPlanner);
  });

  it("does not throw on a day before any week", () => {
    const state = fullStateOf(validPlanner, "");
    const next = PlannerMode_applyFullText(state, "## Day 1\nSquat / 3x5");
    expect(next.fulltext?.text).to.equal("## Day 1\nSquat / 3x5");
    expect(next.current.program.planner).to.equal(validPlanner);
  });
});

describe("PlannerMode_fullTextAfter", () => {
  const renamed = plannerOf([{ name: "Week 1", days: [{ name: "Day 1", exerciseText: "Front Squat / 3x5" }] }]);

  function withPlanner(state: IPlannerState, planner: IPlannerProgram): IPlannerState {
    return { ...state, current: { ...state.current, program: { ...state.current.program, planner } } };
  }

  it("regenerates the text when the program changes from outside the editor", () => {
    const before = fullStateOf(validPlanner, "# Week 1\n## Day 1\nBroken /");
    const text = PlannerMode_fullTextAfter(before, withPlanner(before, renamed))?.text;
    expect(text).to.contain("Front Squat / 3x5");
    expect(text).not.to.contain("Broken");
  });

  it("keeps the text when the same change also wrote the text", () => {
    const before = fullStateOf(validPlanner, "");
    const after = PlannerMode_applyFullText(before, "# Week 1\n## Day 1\nFront Squat / 3x5");
    expect(PlannerMode_fullTextAfter(before, after)).to.equal(undefined);
  });

  it("does nothing outside Full Program", () => {
    const before = stateOf(validPlanner);
    expect(PlannerMode_fullTextAfter(before, withPlanner(before, renamed))).to.equal(undefined);
  });

  it("does nothing when the program did not change", () => {
    const state = fullStateOf(validPlanner, "anything");
    expect(PlannerMode_fullTextAfter(state, { ...state, ui: { ...state.ui, weekIndex: 1 } })).to.equal(undefined);
  });
});

describe("PlannerMode_outsideEditError", () => {
  it("allows the edit outside Full Program mode", () => {
    expect(PlannerMode_outsideEditError(stateOf(validPlanner))).to.equal(undefined);
  });

  it("allows the edit when the Full Program text parses", () => {
    const state = fullStateOf(validPlanner, "# Week 1\n## Day 1\nSquat / 3x5");
    expect(PlannerMode_outsideEditError(state)).to.equal(undefined);
  });

  it("refuses the edit when the Full Program text does not parse", () => {
    const state = fullStateOf(validPlanner, "## Day 1\nSquat / 3x5");
    expect(PlannerMode_outsideEditError(state)).to.be.a("string");
  });
});
