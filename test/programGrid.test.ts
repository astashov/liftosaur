import "mocha";
import { expect } from "chai";
import {
  ProgramGrid_build,
  ProgramGrid_counts,
  ProgramGrid_hasDay,
  ProgramGrid_weekDayCount,
  ProgramGrid_select,
  ProgramGrid_isRelated,
  ProgramGrid_laneNames,
  ProgramGrid_dayDataAt,
  ProgramGrid_cellScheme,
  ProgramGrid_errorAt,
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

function schemeText(tokens: { text: string }[]): string {
  return tokens.map((t) => t.text).join("");
}

function placementsAt(grid: IProgramGrid, rowIndex: number, weekIndex: number): IProgramGridPlacement[] {
  return grid.placements.filter((p) => p.rowIndex === rowIndex && p.colStart <= weekIndex && p.colEnd >= weekIndex);
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
    expect(grid.placements[0].repeatSpan).to.deep.equal([0, 2]);
    expect(schemeText(grid.placements[0].scheme)).to.equal("3x5 100lb");
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
    // The run covers two weeks because they say the same thing, not because anything repeats.
    expect(second.repeatSpan).to.equal(undefined);
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
    expect(squat.reuseOf).to.equal("tmpl");
    expect(ProgramGrid_counts(grid)).to.deep.equal({ weeks: 2, exercises: 1, templates: 1 });
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
    expect(grid.rows.map((row) => ProgramGrid_hasDay(row, 0))).to.deep.equal([true, true]);
    // Week 2 is short, so row 1 has no day there — and therefore no box and no "+ Exercise".
    expect(grid.rows.map((row) => ProgramGrid_hasDay(row, 1))).to.deep.equal([true, false]);
    expect(ProgramGrid_weekDayCount(grid, 0)).to.equal(2);
    expect(ProgramGrid_weekDayCount(grid, 1)).to.equal(1);
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
    expect(schemeText(grid.placements[1].scheme)).to.equal("3x3 60lb");
    expect(schemeText(grid.placements[2].scheme)).to.equal("3x5 100lb");
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

  describe("lane names", () => {
    it("indexes by lane, so lane k is the same exercise in every week", () => {
      const grid = buildGrid(`# Week 1
## Day 1
Squat / 3x5 100lb
Bench Press / 5x5 50lb

# Week 2
## Day 1
Squat / 3x5 100lb
Bench Press / 5x5 50lb
`);
      expect(ProgramGrid_laneNames(grid, 0)).to.eql(["Squat", "Bench Press"]);
    });

    // A drag reports the lane index it was rendered at, and positions it by the same index — so a
    // hole must stay a hole rather than compacting, or every lane after it shifts by one.
    it("keeps holes as empty strings rather than compacting them", () => {
      const grid = buildGrid(`# Week 1
## Day 1
Squat / 3x5 100lb
Bench Press / 5x5 50lb

# Week 2
## Day 1
Deadlift / 1x5 200lb
`);
      const names = ProgramGrid_laneNames(grid, 0);
      expect(names.length).to.equal(grid.placements.filter((p) => p.rowIndex === 0).length);
      for (const placement of grid.placements.filter((p) => p.rowIndex === 0)) {
        expect(names[placement.laneIndex]).to.equal(placement.fullName);
      }
    });

    it("returns an empty list for a row that has no exercises", () => {
      expect(ProgramGrid_laneNames(buildGrid(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`), 3)).to.eql([]);
    });
  });

  describe("day data", () => {
    // `day` is a program-wide counter, not the index within the week — the evaluator numbers days
    // straight through, so week 2 day 1 of a 3-day week is day 4.
    it("counts days across the whole program, not within the week", () => {
      // Week 2 differs, so its run starts there rather than collapsing into week 1's.
      const grid = buildGrid(`# Week 1
## Day 1
Squat / 3x5 100lb

## Day 2
Bench Press / 5x5 50lb

# Week 2
## Day 1
Squat / 3x5 110lb

## Day 2
Bench Press / 5x5 50lb
`);
      const secondWeekFirstDay = grid.placements.find((p) => p.rowIndex === 0 && p.colStart === 1);
      expect(secondWeekFirstDay, "expected a week-2 placement in row 0").to.not.equal(undefined);
      expect(ProgramGrid_dayDataAt(grid, secondWeekFirstDay!)).to.eql({ week: 2, dayInWeek: 1, day: 3 });
    });

    it("counts a ragged week by the days it actually has", () => {
      const grid = buildGrid(`# Week 1
## Day 1
Squat / 3x5 100lb

# Week 2
## Day 1
Squat / 3x5 110lb

## Day 2
Bench Press / 5x5 50lb

# Week 3
## Day 1
Squat / 3x5 120lb
`);
      const thirdWeek = grid.placements.find((p) => p.rowIndex === 0 && p.colStart === 2);
      expect(ProgramGrid_dayDataAt(grid, thirdWeek!).day).to.equal(4);
    });
  });

  describe("cell lookups", () => {
    const grid = buildGrid(`# Week 1
## Day 1
Squat[1-2] / 3x5 100lb
Bench Press / 5x5 50lb

# Week 2
## Day 1
Bench Press / 5x5 50lb
`);

    it("finds every run covering a week, not just the ones starting there", () => {
      expect(placementsAt(grid, 0, 1).map((p) => p.fullName)).to.include("Squat");
      expect(placementsAt(grid, 0, 0).map((p) => p.fullName)).to.have.members(["Squat", "Bench Press"]);
    });

    it("returns nothing for a row or week that holds no run", () => {
      expect(placementsAt(grid, 9, 0)).to.eql([]);
      expect(ProgramGrid_errorAt(grid, 0, 0)).to.equal(undefined);
    });

    it("drops the scheme at the smallest density, keeps it otherwise", () => {
      const placement = grid.placements[0];
      expect(ProgramGrid_cellScheme(placement, 0)).to.eql([]);
      expect(ProgramGrid_cellScheme(placement, 1)).to.eql(placement.scheme);
    });
  });
});
