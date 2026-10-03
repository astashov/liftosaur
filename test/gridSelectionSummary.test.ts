import "mocha";
import { expect } from "chai";
import { GridSelectionSummary_build } from "../src/components/editProgram/editProgramGrid/gridSelectionSummary";
import type {
  IGridSelectionPayload,
  IGridSelectionTarget,
} from "../src/components/editProgram/editProgramGrid/gridSelectionContext";
import { ProgramGrid_build } from "../src/pages/planner/models/programGrid";
import { PlannerProgram_evaluateText } from "../src/pages/planner/models/plannerProgram";
import { Program_create, Program_evaluate } from "../src/models/program";
import { Settings_build } from "../src/models/settings";

const settings = Settings_build();
const planner = {
  vtype: "planner" as const,
  name: "P",
  weeks: PlannerProgram_evaluateText("# Week 1\n## Day 1\nSquat / 3x5\nBench Press / 3x5"),
};
const grid = ProgramGrid_build(Program_evaluate({ ...Program_create("P", "p"), planner }, settings), settings);
const [squat, bench] = grid.placements;

function payloadFor(target: IGridSelectionTarget, calls: string[]): IGridSelectionPayload {
  const log =
    (name: string) =>
    (arg?: unknown): void => {
      calls.push(`${name}:${JSON.stringify(arg)}`);
    };
  return {
    target,
    onEdit: (p) => log("edit")(p.key),
    onDuplicate: (p) => log("duplicate")(p.key),
    onSwap: (p) => log("swap")(p.key),
    onDelete: (ps) => log("delete")(ps.length),
    onDuplicateDays: log("duplicateDays"),
    onDeleteDays: log("deleteDays"),
    onDuplicateWeek: log("duplicateWeek"),
    onDeleteWeek: log("deleteWeek"),
    onEditWeek: log("editWeek"),
    onEditDay: log("editDay"),
    onShowWeekStats: log("weekStats"),
    onShowDayStats: log("dayStats"),
    onShowExerciseStats: (p) => log("exerciseStats")(p.key),
    onClear: log("clear"),
  };
}

describe("GridSelectionSummary_build", () => {
  it("offers every exercise action for one exercise, with Edit enabled", () => {
    const calls: string[] = [];
    const summary = GridSelectionSummary_build(payloadFor({ kind: "exercises", placements: [squat] }, calls));
    expect(summary.label).to.contain("Squat");
    expect(summary.edit?.disabled).to.equal(false);
    expect(summary.actions.map((a) => a.label)).to.deep.equal([
      "Exercise stats",
      "Swap exercise",
      "Duplicate exercise",
      "Delete exercise",
    ]);
    summary.edit?.onPress();
    expect(calls).to.deep.equal([`edit:${JSON.stringify(squat.key)}`]);
  });

  it("leaves out exercise Edit when the host offers none, as the web planner does", () => {
    const payload = { ...payloadFor({ kind: "exercises", placements: [squat] }, []), onEdit: undefined };
    const summary = GridSelectionSummary_build(payload);
    expect(summary.edit).to.equal(undefined);
    expect(summary.actions.map((a) => a.label)).to.contain("Swap exercise");
  });

  it("only offers delete for several exercises, and disables Edit", () => {
    const summary = GridSelectionSummary_build(payloadFor({ kind: "exercises", placements: [squat, bench] }, []));
    expect(summary.edit?.disabled).to.equal(true);
    expect(summary.actions.map((a) => a.label)).to.deep.equal(["Delete exercises"]);
    expect(summary.label).to.contain(", ");
  });

  it("offers week actions for a week", () => {
    const calls: string[] = [];
    const summary = GridSelectionSummary_build(payloadFor({ kind: "week", weekIndex: 0, name: "Week 1" }, calls));
    expect(summary.edit?.label).to.equal("Edit week");
    expect(summary.actions.map((a) => a.label)).to.deep.equal(["Week stats", "Duplicate week", "Delete week"]);
    expect(summary.actions[2].isDestructive).to.equal(true);
    summary.actions[1].onPress();
    expect(calls).to.deep.equal(["duplicateWeek:0"]);
  });

  it("drops day stats and day edit for several days", () => {
    const summary = GridSelectionSummary_build(
      payloadFor({ kind: "day", rowIndexes: [0, 1], name: "Day 1", placements: [] }, [])
    );
    expect(summary.edit?.disabled).to.equal(true);
    expect(summary.actions.map((a) => a.label)).to.deep.equal(["Duplicate days", "Delete days"]);
  });
});
