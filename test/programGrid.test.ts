import "mocha";
import { expect } from "chai";
import {
  ProgramGrid_build,
  ProgramGrid_hasDay,
  ProgramGrid_weekDayCount,
  ProgramGrid_select,
  ProgramGrid_laneNames,
  ProgramGrid_dayDataAt,
  ProgramGrid_errorAt,
  ProgramGrid_hasResolvedLine,
  ProgramGrid_laneResolved,
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

function currentText(tokens: { text: string; isCurrent?: boolean }[]): string {
  return schemeText(tokens.filter((t) => t.isCurrent));
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

function resolvedSections(grid: IProgramGrid, name: string): string[] {
  const placement = grid.placements.find((p) => p.fullName === name)!;
  return placement.resolved.map((s) => `[${s.colStart}-${s.colEnd}] ${schemeText(s.tokens)}`);
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

  it("marks templates and reusers", () => {
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
  });

  it("tells a template from an unused exercise by whether the name is a real exercise", () => {
    const grid = buildGrid(`# Week 1
## Day 1
tmpl / used: none / 3x5 100lb
Bench Press / used: none / 3x5 50lb
Squat / ...tmpl
`);
    const tmpl = grid.placements.find((p) => p.fullName === "tmpl")!;
    const bench = grid.placements.find((p) => p.fullName === "Bench Press")!;
    const squat = grid.placements.find((p) => p.fullName === "Squat")!;
    // A made-up name that only exists to be reused.
    expect([tmpl.notused, tmpl.isTemplate]).to.deep.equal([true, true]);
    // A real exercise that has been switched off — it doesn't run either, but it isn't a template.
    expect([bench.notused, bench.isTemplate]).to.deep.equal([true, false]);
    expect([squat.notused, squat.isTemplate]).to.deep.equal([false, false]);
  });

  it("shows what a reusing line overrides, and shows a plain reuse as just the reference", () => {
    const grid = buildGrid(`# Week 1
## Day 1
tmpl / used: none / 3x5 100lb
Squat / ...tmpl
Bench Press / ...tmpl / 180lb
Deadlift / ...tmpl / 3x8 / @8
`);
    const scheme = (name: string): string => schemeText(grid.placements.find((p) => p.fullName === name)!.scheme);
    expect(scheme("Squat")).to.equal("...tmpl");
    expect(scheme("Bench Press")).to.equal("...tmpl / 180lb");
    expect(scheme("Deadlift")).to.equal("...tmpl / 3x8 / @8");
  });

  it("shows every set variation, and marks the one the program is on", () => {
    const grid = buildGrid(`# Week 1
## Day 1
Squat / 5x3 100lb / !6x2 100lb / 10x1 100lb
Bench Press / 3x5 100lb
`);
    const squat = grid.placements.find((p) => p.fullName === "Squat")!;
    expect(schemeText(squat.scheme)).to.equal("5x3 / 6x2 / 10x1 / 100lb");
    expect(currentText(squat.scheme)).to.equal("6x2 / 100lb");
    const bench = grid.placements.find((p) => p.fullName === "Bench Press")!;
    expect(schemeText(bench.scheme)).to.equal("3x5 100lb");
    expect(currentText(bench.scheme)).to.equal("3x5 100lb");
  });

  it("carries how long each week's copy of a day takes", () => {
    const grid = buildGrid(`# Week 1
## Day 1
Squat / 3x5 100lb

## Day 2

# Week 2
## Day 1
Squat / 10x5 100lb
`);
    const [light, heavy] = grid.rows[0].durationMsPerWeek;
    expect(light).to.be.greaterThan(0);
    // An override makes the same row a different length in that week, which is the reason this is
    // per week rather than per row.
    expect(heavy).to.be.greaterThan(light!);
    // An empty day takes no time; a week that lacks the row has no answer at all.
    expect(grid.rows[1].durationMsPerWeek).to.deep.equal([0, undefined]);
  });

  it("carries the description an exercise is currently on", () => {
    const grid = buildGrid(`# Week 1
## Day 1
// Keep the bar over midfoot
Squat / 3x5 100lb
Bench Press / 3x5 100lb
`);
    const squat = grid.placements.find((p) => p.fullName === "Squat")!;
    expect(squat.description).to.equal("Keep the bar over midfoot");
    expect(grid.placements.find((p) => p.fullName === "Bench Press")!.description).to.equal(undefined);
  });

  it("says a value every group repeats once, after the sets", () => {
    const grid = buildGrid(`# Week 1
## Day 1
Squat / 3x3 86%, 1x3+ 86% / 190s
Bench Press / 3x5 100lb, 1x5 80lb / 90s
Deadlift / 3x5 100lb
`);
    const scheme = (name: string): string => schemeText(grid.placements.find((p) => p.fullName === name)!.scheme);
    expect(scheme("Squat")).to.equal("3x3, 1x3+ / 86% 190s");
    // Only what all of them agree on: the weight differs, so it stays with the sets it belongs to.
    expect(scheme("Bench Press")).to.equal("3x5 100lb, 1x5 80lb / 90s");
    // A lone group has nothing to hoist away from — a separator here would only make it longer.
    expect(scheme("Deadlift")).to.equal("3x5 100lb");
  });

  it("shows every set variation a reusing line overrides", () => {
    const grid = buildGrid(`# Week 1
## Day 1
tmpl / used: none / 3x5 100lb
Squat / ...tmpl / 5x3 / !6x2
Bench Press / ...tmpl / 180lb
`);
    const squat = grid.placements.find((p) => p.fullName === "Squat")!;
    expect(schemeText(squat.scheme)).to.equal("...tmpl / 5x3 / 6x2");
    expect(currentText(squat.scheme)).to.equal("6x2");
    // The reference stays quiet, but what the line writes over it reads like any other sets do.
    const globalsOnly = grid.placements.find((p) => p.fullName === "Bench Press")!;
    expect(schemeText(globalsOnly.scheme)).to.equal("...tmpl / 180lb");
    expect(currentText(globalsOnly.scheme)).to.equal("180lb");
  });

  it("says what a reference resolves to, and gives an ordinary line nothing to resolve", () => {
    const grid = buildGrid(`# Week 1
## Day 1
tmpl / used: none / 5x3 100lb / !6x2 100lb
Squat / ...tmpl
Bench Press / ...tmpl / 180lb
Deadlift / 3x5 100lb
`);
    expect(resolvedSections(grid, "Squat")).to.deep.equal(["[0-0] 5x3 / 6x2 / 100lb"]);
    // The override wins where it is written, and the rest still comes from the source.
    expect(resolvedSections(grid, "Bench Press")).to.deep.equal(["[0-0] 5x3 / 6x2 / 180lb"]);
    // A line that writes its own numbers has them on the scheme already — a second copy says
    // nothing, and it is what keeps the lanes two lines tall in a program with no reuse in it.
    expect(resolvedSections(grid, "Deadlift")).to.deep.equal([]);
    // Which is what keeps a lane with nothing to resolve the height it has always been.
    expect(ProgramGrid_laneResolved(grid, 0)).to.deep.equal([false, true, true, false]);
  });

  it("keeps a reuser one strip, and sections what it resolves to by the weeks that differ", () => {
    const grid = buildGrid(`# Week 1
## Day 1
tmpl / used: none / 5x3 100lb
Squat[1-4] / ...tmpl

# Week 2
## Day 1
tmpl / used: none / 3x3 120lb

# Week 3
## Day 1
tmpl / used: none / 3x3 120lb

# Week 4
## Day 1
tmpl / used: none / 2x2 140lb
`);
    // One strip: the reusing line reads the same in every week, which is what a run is.
    expect(spansFor(grid, "Squat")).to.deep.equal(["Squat@r0[0-3]"]);
    // Inside it, the numbers are run-length encoded in turn — weeks 2 and 3 resolve alike, so they
    // share a section rather than repeating themselves.
    expect(resolvedSections(grid, "Squat")).to.deep.equal(["[0-0] 5x3 100lb", "[1-2] 3x3 120lb", "[3-3] 2x2 140lb"]);
  });

  it("has no resolved line when the thing it reuses resolves to nothing", () => {
    const grid = buildGrid(`# Week 1
## Day 1
Squat / used: none
Bench Press / ...Squat
`);
    const bench = grid.placements.find((p) => p.fullName === "Bench Press")!;
    // The section is still there — sections are laid against the week columns they cover, and a
    // hole with no width would slide the ones after it into the wrong columns.
    expect(resolvedSections(grid, "Bench Press")).to.deep.equal(["[0-0] "]);
    // But there is nothing to print, so the lane keeps its two-line height and the cell must draw
    // no third line. Both ask this one question; when they each spelled out their own test, the
    // geometry said "short lane" while the cell drew a blank line into it.
    expect(ProgramGrid_hasResolvedLine(bench)).to.equal(false);
    expect(ProgramGrid_laneResolved(grid, 0)).to.deep.equal([false, false]);
  });

  it("gives a uniform reuse one section spanning the whole strip", () => {
    const grid = buildGrid(`# Week 1
## Day 1
tmpl[1-3] / used: none / 3x5 100lb
Squat[1-3] / ...tmpl

# Week 2
## Day 1

# Week 3
## Day 1
`);
    expect(resolvedSections(grid, "Squat")).to.deep.equal(["[0-2] 3x5 100lb"]);
  });

  it("shows every exercise variation, and marks the one the program is on", () => {
    const grid = buildGrid(`# Week 1
## Day 1
Squat | ! Pistol Squat | Front Squat / 3x5 100lb
Bench Press / 3x5 100lb
`);
    const squat = grid.placements.find((p) => p.nameParts.length > 1)!;
    expect(squat.nameParts).to.deep.equal([
      { text: "Squat", isCurrent: false },
      { text: "Pistol Squat", isCurrent: true },
      { text: "Front Squat", isCurrent: false },
    ]);
    const bench = grid.placements.find((p) => p.fullName === "Bench Press")!;
    expect(bench.nameParts).to.deep.equal([{ text: "Bench Press", isCurrent: true }]);
  });

  it("carries the structural facts a strip has no room for", () => {
    const grid = buildGrid(`# Week 1
## Day 1
Squat[2] / 3x5 100lb / id: tags(3, 5) / progress: lp(5lb)
Bench Press / 3x5 50lb / progress: dp(5lb, 8, 12)
Deadlift / 1x5 200lb
`);
    const squat = grid.placements.find((p) => p.fullName === "Squat")!;
    const bench = grid.placements.find((p) => p.fullName === "Bench Press")!;
    const deadlift = grid.placements.find((p) => p.fullName === "Deadlift")!;
    expect(squat.order).to.equal(2);
    expect(squat.tags).to.deep.equal([3, 5]);
    expect(squat.progression).to.equal("progress: lp(5lb)");
    expect(bench.progression).to.equal("progress: dp(5lb, 8, 12)");
    // No forced order is 0 in the evaluator, and nothing to say in the dock.
    expect(deadlift.order).to.equal(undefined);
    expect(deadlift.tags).to.deep.equal([]);
    expect(deadlift.progression).to.equal(undefined);
  });

  it("colors supersets by day row, and gives a group of one no color at all", () => {
    const grid = buildGrid(`# Week 1
## Day 1
Squat / 3x5 100lb / superset: A
Bench Press / 3x5 50lb / superset: A
Deadlift / 1x5 200lb / superset: B
Pull Up / 5x10 0lb / superset: C
Push Up / 5x15 0lb / superset: C
Chin Up / 5x10 0lb

# Week 2
## Day 1
Squat / 3x5 100lb / superset: A
Bench Press / 3x5 50lb / superset: A
`);
    const color = (name: string): string | undefined => grid.placements.find((p) => p.fullName === name)!.supersetColor;
    expect(color("Squat")).to.equal("red");
    // Its partner shares the color — that is the whole point of the line.
    expect(color("Bench Press")).to.equal("red");
    // B has one member, so no line; but it still consumes an index, keeping this in step with the
    // workout screen's assignment for the same day.
    expect(color("Deadlift")).to.equal(undefined);
    expect(color("Pull Up")).to.equal("green");
    expect(color("Push Up")).to.equal("green");
    expect(color("Chin Up")).to.equal(undefined);
  });

  it("keeps a supersetted lane the same color in every week", () => {
    const grid = buildGrid(`# Week 1
## Day 1
Squat / 5x5 100lb / superset: A
Bench Press / 3x5 50lb / superset: A

# Week 2
## Day 1
Squat / 3x3 120lb / superset: A
Bench Press / 3x5 50lb / superset: A
`);
    // Two runs of Squat, because the weeks differ — a superset belongs to the day, so both say red.
    const squats = grid.placements.filter((p) => p.fullName === "Squat");
    expect(squats.length).to.equal(2);
    expect(squats.map((p) => p.supersetColor)).to.deep.equal(["red", "red"]);
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

    // An exercise with no reuse relationship to the selection is in neither set, so it gets no ring.
    expect(fromSource.linkedIds.has(curl.id)).to.equal(false);
    expect(fromSource.sameExerciseIds.has(curl.id)).to.equal(false);
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
      expect(ProgramGrid_dayDataAt(grid, secondWeekFirstDay!.rowIndex, secondWeekFirstDay!.colStart)).to.eql({
        week: 2,
        dayInWeek: 1,
        day: 3,
      });
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
      expect(ProgramGrid_dayDataAt(grid, thirdWeek!.rowIndex, thirdWeek!.colStart).day).to.equal(4);
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
  });
});
