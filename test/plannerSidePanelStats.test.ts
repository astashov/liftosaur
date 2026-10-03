import "mocha";
import { expect } from "chai";
import {
  PlannerSidePanelStats_cursor,
  PlannerSidePanelStats_cursorFor,
  PlannerSidePanelStats_cursorFromSelection,
  PlannerSidePanelStats_emptyMessage,
  PlannerSidePanelStats_forSelection,
  PlannerSidePanelStats_selectionKey,
  PlannerSidePanelStats_select,
} from "../src/pages/planner/models/plannerSidePanelStats";
import {
  PlannerProgram_evaluate,
  PlannerProgram_evaluateFull,
  PlannerProgram_evaluateText,
  PlannerProgram_generateFullText,
} from "../src/pages/planner/models/plannerProgram";
import { ProgramGrid_build } from "../src/pages/planner/models/programGrid";
import { IPlannerState, IPlannerUi } from "../src/pages/planner/models/types";
import { IPlannerProgram } from "../src/types";
import { Program_create, Program_evaluate } from "../src/models/program";
import { Settings_build } from "../src/models/settings";

const settings = Settings_build();

function plannerOf(text: string): IPlannerProgram {
  return { vtype: "planner", name: "P", weeks: PlannerProgram_evaluateText(text) };
}

const planner = plannerOf(
  "# Week 1\n## Day 1\nSquat / 3x5\nBench Press / 3x5\n## Day 2\nDeadlift / 1x5\n\n# Week 2\n## Day 1\nSquat / 3x3\n## Day 2\nDeadlift / 1x3"
);

function uiOf(over: Partial<IPlannerUi> = {}): IPlannerUi {
  return {
    weekIndex: 0,
    exerciseUi: { edit: new Set(), collapsed: new Set() },
    dayUi: { collapsed: new Set() },
    ...over,
  };
}

function stateOf(ui: IPlannerUi, fulltext?: IPlannerState["fulltext"]): IPlannerState {
  return {
    id: "p",
    current: { program: { ...Program_create("P", "p"), planner } },
    ui,
    fulltext,
    history: { past: [], future: [] },
  };
}

const evaluatedWeeks = PlannerProgram_evaluate(planner, settings).evaluatedWeeks;

describe("PlannerSidePanelStats_cursor", () => {
  it("uses the selected week tab when nothing is focused", () => {
    expect(PlannerSidePanelStats_cursor(stateOf(uiOf({ weekIndex: 1 })))).to.deep.equal({ weekIndex: 1 });
  });

  it("uses the focused exercise in the selected week", () => {
    const ui = uiOf({ weekIndex: 1, focusedExercise: { weekIndex: 1, dayIndex: 0, exerciseLine: 0 } });
    expect(PlannerSidePanelStats_cursor(stateOf(ui))).to.deep.equal({ weekIndex: 1, dayIndex: 0, exerciseLine: 0 });
  });

  it("ignores a focus left behind in another week tab", () => {
    const ui = uiOf({ weekIndex: 1, focusedExercise: { weekIndex: 0, dayIndex: 1, exerciseLine: 0 } });
    expect(PlannerSidePanelStats_cursor(stateOf(ui))).to.deep.equal({ weekIndex: 1 });
  });

  it("in Reorder without a selection, ignores a focus left behind by By Weeks", () => {
    const ui = uiOf({ mode: "grid", weekIndex: 0, focusedExercise: { weekIndex: 0, dayIndex: 1, exerciseLine: 0 } });
    expect(PlannerSidePanelStats_cursor(stateOf(ui))).to.deep.equal({ weekIndex: 0 });
  });

  describe("in Full Program", () => {
    const text = PlannerProgram_generateFullText(planner.weeks);
    const lines = text.split("\n");
    const full = PlannerProgram_evaluateFull(text, settings).evaluatedWeeks;
    function cursorAt(index: number): ReturnType<typeof PlannerSidePanelStats_cursor> {
      const editorLine = index + 1;
      return PlannerSidePanelStats_cursor(stateOf(uiOf({ mode: "full" }), { text, currentLine: editorLine }), full);
    }

    it("finds the week, the day and the exercise from the line", () => {
      const benchLine = lines.indexOf("Bench Press / 3x5");
      const cursor = cursorAt(benchLine);
      expect(cursor.weekIndex).to.equal(0);
      expect(cursor.dayIndex).to.equal(0);
      expect(cursor.exerciseLine).to.be.a("number");
    });

    it("gives a day without an exercise on a day heading", () => {
      const week2Day2 = lines.lastIndexOf("## Day 2");
      const cursor = cursorAt(week2Day2);
      expect(cursor).to.deep.equal({ weekIndex: 1, dayIndex: 1, exerciseLine: undefined });
    });

    it("gives only the week on a week heading", () => {
      expect(cursorAt(lines.indexOf("# Week 2"))).to.deep.equal({ weekIndex: 1 });
    });

    it("reports errors instead of a cursor when the text does not evaluate", () => {
      const broken = text.replace("Squat / 3x5", "Squat / 3x");
      const brokenFull = PlannerProgram_evaluateFull(broken, settings).evaluatedWeeks;
      const cursor = PlannerSidePanelStats_cursor(
        stateOf(uiOf({ mode: "full" }), { text: broken, currentLine: 3 }),
        brokenFull
      );
      expect(cursor).to.deep.equal({ hasErrors: true });
    });
  });
});

describe("PlannerSidePanelStats_select", () => {
  const benchLine = evaluatedWeeks[0][0].success
    ? evaluatedWeeks[0][0].data.find((e) => e.name === "Bench Press")!.line
    : -1;

  it("shows the week for the Weekly tab with only a week known", () => {
    const result = PlannerSidePanelStats_select("week", { weekIndex: 1 }, evaluatedWeeks, settings);
    expect(result.kind).to.equal("week");
  });

  it("asks for a cursor on Daily and Exercise when no day is known", () => {
    expect(PlannerSidePanelStats_select("day", { weekIndex: 0 }, evaluatedWeeks, settings)).to.deep.equal({
      kind: "empty",
      reason: "noCursor",
    });
    expect(PlannerSidePanelStats_select("exercise", {}, evaluatedWeeks, settings)).to.deep.equal({
      kind: "empty",
      reason: "noCursor",
    });
  });

  it("shows the day and the exercise when both are known", () => {
    const cursor = { weekIndex: 0, dayIndex: 0, exerciseLine: benchLine };
    expect(PlannerSidePanelStats_select("day", cursor, evaluatedWeeks, settings).kind).to.equal("day");
    expect(PlannerSidePanelStats_select("exercise", cursor, evaluatedWeeks, settings)).to.deep.equal({
      kind: "exercise",
      weekIndex: 0,
      dayIndex: 0,
      exerciseLine: benchLine,
    });
  });

  it("returns out of range instead of throwing after a week or day was deleted", () => {
    expect(PlannerSidePanelStats_select("week", { weekIndex: 5 }, evaluatedWeeks, settings).kind).to.equal("empty");
    const result = PlannerSidePanelStats_select(
      "exercise",
      { weekIndex: 0, dayIndex: 9, exerciseLine: 0 },
      evaluatedWeeks,
      settings
    );
    expect(result).to.deep.equal({ kind: "empty", reason: "outOfRange" });
  });

  it("returns no exercise for a line with no exercise on it", () => {
    const result = PlannerSidePanelStats_select(
      "exercise",
      { weekIndex: 0, dayIndex: 0, exerciseLine: 99 },
      evaluatedWeeks,
      settings
    );
    expect(result).to.deep.equal({ kind: "empty", reason: "noExercise" });
  });

  it("tells errors apart from a missing cursor", () => {
    const broken = plannerOf("# Week 1\n## Day 1\nSquat / 3x");
    const brokenWeeks = PlannerProgram_evaluate(broken, settings).evaluatedWeeks;
    const result = PlannerSidePanelStats_select("day", { weekIndex: 0, dayIndex: 0 }, brokenWeeks, settings);
    expect(result).to.deep.equal({ kind: "empty", reason: "hasErrors" });
    expect(PlannerSidePanelStats_select("week", { hasErrors: true }, evaluatedWeeks, settings)).to.deep.equal({
      kind: "empty",
      reason: "hasErrors",
    });
  });
});

describe("PlannerSidePanelStats_emptyMessage", () => {
  it("says to fix errors first, whatever the tab", () => {
    expect(PlannerSidePanelStats_emptyMessage("hasErrors", "day", false)).to.contain("Fix the errors");
  });

  it("asks for a cursor in By Weeks and Full Program, and for a selection in Reorder", () => {
    expect(PlannerSidePanelStats_emptyMessage("noCursor", "day", false)).to.contain("cursor in a day");
    expect(PlannerSidePanelStats_emptyMessage("noCursor", "day", true)).to.contain("Select one day");
    expect(PlannerSidePanelStats_emptyMessage("noExercise", "exercise", false)).to.contain("cursor on an exercise");
    expect(PlannerSidePanelStats_emptyMessage("noCursor", "exercise", true)).to.contain("Select one exercise");
  });
});

describe("selection in Reorder", () => {
  const evaluatedProgram = Program_evaluate({ ...Program_create("P", "p"), planner }, settings);
  const grid = ProgramGrid_build(evaluatedProgram, settings);
  const bench = grid.placements.find((p) => p.fullName.startsWith("Bench Press"))!;

  it("picks the tab for a week, one day and one exercise", () => {
    expect(PlannerSidePanelStats_forSelection({ kind: "week", weekIndex: 1, name: "Week 2" })).to.equal("week");
    expect(
      PlannerSidePanelStats_forSelection({ kind: "day", rowIndexes: [1], name: "Day 2", placements: [] })
    ).to.equal("day");
    expect(PlannerSidePanelStats_forSelection({ kind: "exercises", placements: [bench] })).to.equal("exercise");
  });

  it("leaves the tab alone for a multi-selection", () => {
    expect(PlannerSidePanelStats_forSelection({ kind: "day", rowIndexes: [0, 1], name: "", placements: [] })).to.equal(
      undefined
    );
    expect(PlannerSidePanelStats_forSelection({ kind: "exercises", placements: [bench, bench] })).to.equal(undefined);
  });

  it("turns one selected exercise into a cursor the stats can read", () => {
    const cursor = PlannerSidePanelStats_cursorFromSelection(
      { kind: "exercises", placements: [bench] },
      grid,
      evaluatedProgram
    );
    expect(cursor.weekIndex).to.equal(0);
    expect(cursor.dayIndex).to.equal(0);
    expect(PlannerSidePanelStats_select("exercise", cursor, evaluatedWeeks, settings).kind).to.equal("exercise");
  });

  it("puts a selected day in the first week that has it", () => {
    const cursor = PlannerSidePanelStats_cursorFromSelection(
      { kind: "day", rowIndexes: [1], name: "Day 2", placements: [] },
      grid,
      evaluatedProgram
    );
    expect(cursor).to.deep.equal({ weekIndex: 0, dayIndex: 1 });
  });

  it("keys a rebuilt target with the same content the same, so a re-render keeps the chosen tab", () => {
    const first = PlannerSidePanelStats_selectionKey({ kind: "exercises", placements: [bench] });
    const rebuilt = PlannerSidePanelStats_selectionKey({ kind: "exercises", placements: [{ ...bench }] });
    expect(rebuilt).to.equal(first);
  });

  it("keys different selections differently", () => {
    const squat = grid.placements.find((p) => p.fullName.startsWith("Squat"))!;
    const keys = [
      PlannerSidePanelStats_selectionKey({ kind: "exercises", placements: [bench] }),
      PlannerSidePanelStats_selectionKey({ kind: "exercises", placements: [squat] }),
      PlannerSidePanelStats_selectionKey({ kind: "exercises", placements: [bench, squat] }),
      PlannerSidePanelStats_selectionKey({ kind: "week", weekIndex: 0, name: "Week 1" }),
      PlannerSidePanelStats_selectionKey({ kind: "week", weekIndex: 1, name: "Week 2" }),
      PlannerSidePanelStats_selectionKey({ kind: "day", rowIndexes: [0], name: "Day 1", placements: [] }),
      PlannerSidePanelStats_selectionKey({ kind: "day", rowIndexes: [0, 1], name: "", placements: [] }),
    ];
    expect(new Set(keys).size).to.equal(keys.length);
  });

  it("has no key without a selection", () => {
    expect(PlannerSidePanelStats_selectionKey(undefined)).to.equal(undefined);
  });

  it("takes the cursor from the selection in Reorder and from the editor otherwise", () => {
    const target = { kind: "exercises" as const, placements: [bench] };
    const grid0 = grid;
    const focused = { weekIndex: 0, dayIndex: 1, exerciseLine: 1 };
    const reorder = stateOf(uiOf({ mode: "grid", focusedExercise: focused }));
    const byWeeks = stateOf(uiOf({ focusedExercise: focused }));
    expect(
      PlannerSidePanelStats_cursorFor({ state: reorder, target, grid: grid0, evaluatedProgram }).dayIndex
    ).to.equal(0);
    expect(PlannerSidePanelStats_cursorFor({ state: reorder })).to.deep.equal({ weekIndex: 0 });
    expect(PlannerSidePanelStats_cursorFor({ state: byWeeks, target, grid: grid0, evaluatedProgram })).to.deep.equal(
      focused
    );
  });

  it("gives no cursor for several days", () => {
    const cursor = PlannerSidePanelStats_cursorFromSelection(
      { kind: "day", rowIndexes: [0, 1], name: "", placements: [] },
      grid,
      evaluatedProgram
    );
    expect(cursor).to.deep.equal({});
  });
});
