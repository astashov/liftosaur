import "mocha";
import { expect } from "chai";
import {
  ProgramGrid_build,
  ProgramGrid_schemeToString,
  ProgramGrid_select,
  ProgramGrid_isRelated,
  IProgramGrid,
  IProgramGridPlacement,
} from "../src/pages/planner/models/programGrid";
import { PlannerProgram_evaluateText } from "../src/pages/planner/models/plannerProgram";
import { Program_evaluate, Program_create } from "../src/models/program";
import { Settings_build } from "../src/models/settings";
import { IPlannerProgram, IProgram } from "../src/types";

function buildGrid(text: string): IProgramGrid {
  const planner: IPlannerProgram = { vtype: "planner", name: "P", weeks: PlannerProgram_evaluateText(text) };
  const program: IProgram = { ...Program_create("P"), planner };
  return ProgramGrid_build(Program_evaluate(program, Settings_build()), Settings_build());
}

function span(placement: IProgramGridPlacement): string {
  return `${placement.fullName}@r${placement.rowIndex}[${placement.colStart}-${placement.colEnd}]`;
}

function spansFor(grid: IProgramGrid, name: string): string[] {
  return grid.placements.filter((p) => p.fullName === name).map(span);
}

describe("ProgramGrid", () => {
  it("collapses a repeat into a single strip spanning its range", () => {
    const grid = buildGrid(`# Week 1
## Day 1
Squat[1-3] / 3x5 100lb

# Week 2
## Day 1

# Week 3
## Day 1
`);
    expect(spansFor(grid, "Squat")).to.deep.equal(["Squat@r0[0-2]"]);
    expect(grid.placements[0].runKind).to.equal("repeat");
    expect(ProgramGrid_schemeToString(grid.placements[0].scheme)).to.equal("3x5 100lb");
  });

  it("collapses identical consecutive weeks and breaks the run where the definition differs", () => {
    const grid = buildGrid(`# Week 1
## Day 1
Bench Press / 5x5 50lb

# Week 2
## Day 1
Bench Press / 5x5 60lb

# Week 3
## Day 1
Bench Press / 5x5 60lb
`);
    expect(spansFor(grid, "Bench Press")).to.deep.equal(["Bench Press@r0[0-0]", "Bench Press@r0[1-2]"]);
    const second = grid.placements[1];
    expect(second.runKind).to.equal("identical");
    expect(second.isOverride).to.equal(false);
  });

  it("keeps undulating weeks as separate cells", () => {
    const grid = buildGrid(`# Week 1
## Day 1
Squat / 5x5 100lb

# Week 2
## Day 1
Squat / 3x3 120lb

# Week 3
## Day 1
Squat / 1x1 140lb
`);
    expect(spansFor(grid, "Squat")).to.deep.equal(["Squat@r0[0-0]", "Squat@r0[1-1]", "Squat@r0[2-2]"]);
  });

  it("marks templates and reusers, and excludes templates from the exercise count", () => {
    const grid = buildGrid(`# Week 1
## Day 1
tmpl[1-2] / used: none / 3x5 100lb
Squat[1-2] / ...tmpl

# Week 2
## Day 1
`);
    const tmpl = grid.placements.find((p) => p.fullName === "tmpl")!;
    const squat = grid.placements.find((p) => p.fullName === "Squat")!;
    expect(tmpl.isTemplate).to.equal(true);
    expect(tmpl.isReuseSource).to.equal(true);
    expect(squat.isReuser).to.equal(true);
    expect(squat.reuseOf).to.equal("tmpl");
    expect(grid.counts).to.deep.equal({ weeks: 2, exercises: 1, templates: 1 });
  });

  it("is ragged — a row only exists in the weeks that have that day", () => {
    const grid = buildGrid(`# Week 1
## Day 1
Squat / 3x5 100lb

## Day 2
Deadlift / 1x5 200lb

# Week 2
## Day 1
Squat / 3x5 100lb
`);
    expect(grid.rows.length).to.equal(2);
    expect(grid.rows[0].weekIndexes).to.deep.equal([0, 1]);
    expect(grid.rows[1].weekIndexes).to.deep.equal([0]);
    expect(spansFor(grid, "Deadlift")).to.deep.equal(["Deadlift@r1[0-0]"]);
  });

  it("does not merge a run across a week where the exercise is absent", () => {
    const grid = buildGrid(`# Week 1
## Day 1
Squat / 3x5 100lb

# Week 2
## Day 1
Bench Press / 5x5 50lb

# Week 3
## Day 1
Squat / 3x5 100lb
`);
    expect(spansFor(grid, "Squat")).to.deep.equal(["Squat@r0[0-0]", "Squat@r0[2-2]"]);
  });

  it("reports per-day errors positioned in the grid", () => {
    const grid = buildGrid(`# Week 1
## Day 1
tmpl / used: none / 3x5 100lb
Squat[1-2] / ...tmpl

# Week 2
## Day 1
`);
    expect(grid.errors.length).to.be.greaterThan(0);
    expect(grid.errors[0].weekIndex).to.equal(1);
    expect(grid.errors[0].rowIndex).to.equal(0);
  });

  it("renders an override as a run-break: strip, cell, strip", () => {
    const grid = buildGrid(`# Week 1
## Day 1
Squat[1-4] / 3x5 100lb

# Week 2
## Day 1

# Week 3
## Day 1
Squat / 3x3 60lb

# Week 4
## Day 1
`);
    expect(spansFor(grid, "Squat")).to.deep.equal(["Squat@r0[0-1]", "Squat@r0[2-2]", "Squat@r0[3-3]"]);
    expect(grid.placements.map((p) => p.isOverride)).to.deep.equal([false, true, false]);
    expect(ProgramGrid_schemeToString(grid.placements[1].scheme)).to.equal("3x3 60lb");
    expect(ProgramGrid_schemeToString(grid.placements[2].scheme)).to.equal("3x5 100lb");
  });

  it("does not call undulation an override — there is no repeat to punch into", () => {
    const grid = buildGrid(`# Week 1
## Day 1
Squat / 5x5 100lb

# Week 2
## Day 1
Squat / 3x3 120lb
`);
    expect(grid.placements.every((p) => !p.isOverride)).to.equal(true);
  });

  it("only calls a run an override when it falls inside a span some repeat claims", () => {
    const grid = buildGrid(`# Week 1
## Day 1
Squat / 5x5 100lb

# Week 2
## Day 1
Squat[2-3] / 3x3 120lb

# Week 3
## Day 1

# Week 4
## Day 1
Squat / 1x1 140lb
`);
    expect(spansFor(grid, "Squat")).to.deep.equal(["Squat@r0[0-0]", "Squat@r0[1-2]", "Squat@r0[3-3]"]);
    expect(grid.placements.map((p) => p.isOverride)).to.deep.equal([false, false, false]);
    expect(grid.placements[1].repeatSpan).to.deep.equal([1, 2]);
  });

  it("lights up the source when a reuser is selected, and every reuser when the source is", () => {
    const grid = buildGrid(`# Week 1
## Day 1
tmpl[1-2] / used: none / 3x5 100lb
Squat[1-2] / ...tmpl
Bench Press[1-2] / ...tmpl
Bicep Curl[1-2] / 3x12 20lb

# Week 2
## Day 1
`);
    const tmpl = grid.placements.find((p) => p.fullName === "tmpl")!;
    const squat = grid.placements.find((p) => p.fullName === "Squat")!;
    const bench = grid.placements.find((p) => p.fullName === "Bench Press")!;
    const curl = grid.placements.find((p) => p.fullName === "Bicep Curl")!;

    const fromReuser = ProgramGrid_select(grid, [squat.id])!;
    expect(Array.from(fromReuser.linkedIds)).to.deep.equal([tmpl.id]);

    const fromSource = ProgramGrid_select(grid, [tmpl.id])!;
    expect(Array.from(fromSource.linkedIds).sort()).to.deep.equal([squat.id, bench.id].sort());

    expect(ProgramGrid_isRelated(fromSource, curl.id)).to.equal(false);
    expect(ProgramGrid_isRelated(undefined, curl.id)).to.equal(true);
  });

  it("relates the separate runs of one exercise to each other", () => {
    const grid = buildGrid(`# Week 1
## Day 1
Squat / 5x5 100lb

# Week 2
## Day 1
Squat / 3x3 120lb
`);
    const [first, second] = grid.placements;
    const selection = ProgramGrid_select(grid, [first.id])!;
    expect(Array.from(selection.sameExerciseIds)).to.deep.equal([second.id]);
    expect(selection.linkedIds.size).to.equal(0);
  });

  it("keeps two exercises in stable lanes across weeks regardless of authored order", () => {
    const grid = buildGrid(`# Week 1
## Day 1
Squat[1-2] / 3x5 100lb
Bench Press / 5x5 50lb

# Week 2
## Day 1
Bench Press / 5x5 60lb
`);
    const squat = grid.placements.find((p) => p.fullName === "Squat")!;
    const bench = grid.placements.find((p) => p.fullName === "Bench Press")!;
    expect(squat.laneIndex).to.equal(0);
    expect(bench.laneIndex).to.equal(1);
  });
});
