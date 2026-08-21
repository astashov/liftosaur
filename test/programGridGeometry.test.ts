import "mocha";
import { expect } from "chai";
import {
  GRID_BASE_COLUMN_WIDTH,
  IGridGeometryRow,
  ProgramGridGeometry_build,
  ProgramGridGeometry_clampWeek,
  ProgramGridGeometry_resizeHandleLeft,
  GRID_CELL_INSET_X,
  GRID_RESIZE_HANDLE_WIDTH,
  ProgramGridGeometry_dayDropAt,
  ProgramGridGeometry_gapForMove,
  ProgramGridGeometry_indexForGap,
  ProgramGridGeometry_isLaneDropNoop,
  ProgramGridGeometry_laneDropAt,
  ProgramGridGeometry_laneSegments,
  ProgramGridGeometry_metrics,
  ProgramGridGeometry_totalHeight,
  ProgramGridGeometry_weekDropAt,
  ProgramGridGeometry_weekLaneNames,
} from "../src/pages/planner/models/programGridGeometry";
import { ProgramGrid_build, IProgramGrid } from "../src/pages/planner/models/programGrid";
import { PlannerProgram_evaluateText } from "../src/pages/planner/models/plannerProgram";
import { Program_evaluate, Program_create } from "../src/models/program";
import { Settings_build } from "../src/models/settings";
import { IProgram } from "../src/types";

function buildGrid(text: string): IProgramGrid {
  const program: IProgram = {
    ...Program_create("P"),
    planner: { vtype: "planner", name: "P", weeks: PlannerProgram_evaluateText(text) },
  };
  return ProgramGrid_build(Program_evaluate(program, Settings_build()), Settings_build());
}

// Two rows: row 0 has two lanes, row 1 has one. With rem = 16 and laneHeight = 50 that makes
// row 0 = 32 (label) + 100 (lanes) + 24 (add) + 4 (gap) = 160, +4 margin = 164
// row 1 = 32 + 50 + 24 + 4 = 110, +4 margin = 114
function rowsFixture(): IGridGeometryRow[] {
  return ProgramGridGeometry_build(
    buildGrid(`# Week 1
## Day 1
Squat / 3x5 100lb
Bench Press / 5x5 50lb

## Day 2
Deadlift / 1x5 200lb
`),
    [],
    50,
    16
  );
}

describe("ProgramGridGeometry", () => {
  describe("build", () => {
    it("stacks rows by their own content height", () => {
      const rows = rowsFixture();
      expect(rows).to.have.length(2);
      expect(rows[0].top).to.equal(0);
      expect(rows[0].height).to.equal(160);
      expect(rows[0].outerHeight).to.equal(164);
      expect(rows[0].contentTop).to.equal(32);
      expect(rows[0].laneNames).to.deep.equal(["Squat", "Bench Press"]);
      // The second row starts below the first, margin included.
      expect(rows[1].top).to.equal(164);
      expect(rows[1].laneNames).to.deep.equal(["Deadlift"]);
      expect(ProgramGridGeometry_totalHeight(rows)).to.equal(164 + 114);
    });

    it("collapses a row to its label, and the rows below move up", () => {
      const grid = buildGrid(`# Week 1
## Day 1
Squat / 3x5 100lb
Bench Press / 5x5 50lb

## Day 2
Deadlift / 1x5 200lb
`);
      const rows = ProgramGridGeometry_build(grid, [0], 50, 16);
      expect(rows[0].height).to.equal(36);
      expect(rows[0].isCollapsed).to.equal(true);
      // Still knows its lanes — the ghost draws them even while the row itself is collapsed.
      expect(rows[0].laneNames).to.deep.equal(["Squat", "Bench Press"]);
      expect(rows[1].top).to.equal(40);
    });
  });

  describe("metrics", () => {
    it("divides the width between one or two weeks, and scrolls from three", () => {
      const fit = ProgramGridGeometry_metrics({ weekCount: 2, containerWidth: 400, rem: 16 });
      expect(fit.columnWidth).to.equal(200);
      const scroll = ProgramGridGeometry_metrics({ weekCount: 3, containerWidth: 400, rem: 16 });
      expect(scroll.columnWidth).to.equal(GRID_BASE_COLUMN_WIDTH * 16);
    });

    it("an explicit scale wins over fitting", () => {
      const metrics = ProgramGridGeometry_metrics({ weekCount: 2, containerWidth: 400, scale: 0.6, rem: 16 });
      expect(metrics.columnWidth).to.equal(GRID_BASE_COLUMN_WIDTH * 0.6 * 16);
      expect(metrics.scale).to.equal(0.6);
    });

    it("drops the scheme and shrinks the lanes once a column gets narrow", () => {
      const wide = ProgramGridGeometry_metrics({ weekCount: 3, containerWidth: 400, scale: 1, rem: 16 });
      expect(wide.density).to.equal(2);
      expect(wide.laneHeight).to.equal(3.25 * 16);
      const narrow = ProgramGridGeometry_metrics({ weekCount: 3, containerWidth: 400, scale: 0.6, rem: 16 });
      expect(narrow.density).to.equal(0);
      expect(narrow.laneHeight).to.equal(2 * 16);
    });
  });

  describe("gaps and indexes", () => {
    it("a gap below the item's own position is one further along than the index it lands at", () => {
      // [A,B,C], moving A to index 1 -> [B,A,C]: the line belongs below B, i.e. gap 2.
      expect(ProgramGridGeometry_gapForMove(0, 1)).to.equal(2);
      // Dragging up, index and gap coincide: moving C to index 1 puts the line above B.
      expect(ProgramGridGeometry_gapForMove(2, 1)).to.equal(1);
      expect(ProgramGridGeometry_gapForMove(1, 1)).to.equal(-1);
    });

    it("round-trips a gap back to the index it lands at", () => {
      for (const from of [0, 1, 2, 3]) {
        for (const to of [0, 1, 2, 3]) {
          if (from === to) {
            continue;
          }
          expect(ProgramGridGeometry_indexForGap(from, ProgramGridGeometry_gapForMove(from, to))).to.equal(to);
        }
      }
    });
  });

  describe("laneDropAt", () => {
    it("follows the strip's centre, not the grab point", () => {
      const rows = rowsFixture();
      // Lane 0 of row 0 sits at 32..82, so its centre starts at 57. Nudge it down by 50 and it is
      // over lane 1, which means the gap below lane 1.
      const drop = ProgramGridGeometry_laneDropAt(rows, 0, 0, 50, 50)!;
      expect(drop.toRow).to.equal(0);
      expect(drop.gap).to.equal(2);
      expect(drop.ghostY).to.equal(82);
    });

    it("lands in another row once the centre crosses into it", () => {
      const rows = rowsFixture();
      // Row 1 starts at 164; from lane 0's centre (57) that needs +107 or more. Landing above
      // Deadlift's own centre means the gap before it.
      const above = ProgramGridGeometry_laneDropAt(rows, 0, 0, 120, 50)!;
      expect(above.toRow).to.equal(1);
      expect(above.gap).to.equal(0);
      // Past Deadlift's centre (196 + 25) it becomes the gap after it.
      const below = ProgramGridGeometry_laneDropAt(rows, 0, 0, 170, 50)!;
      expect(below.toRow).to.equal(1);
      expect(below.gap).to.equal(1);
    });

    it("sends anything dropped on a collapsed row to its end", () => {
      const grid = buildGrid(`# Week 1
## Day 1
Squat / 3x5 100lb
Bench Press / 5x5 50lb

## Day 2
Deadlift / 1x5 200lb
`);
      const rows = ProgramGridGeometry_build(grid, [1], 50, 16);
      const drop = ProgramGridGeometry_laneDropAt(rows, 0, 0, 200, 50)!;
      expect(drop.toRow).to.equal(1);
      expect(drop.gap).to.equal(rows[1].laneNames.length);
    });

    it("knows when a drop would change nothing", () => {
      const rows = rowsFixture();
      const stay = ProgramGridGeometry_laneDropAt(rows, 0, 1, 0, 50)!;
      expect(ProgramGridGeometry_isLaneDropNoop(stay, 0, 1)).to.equal(true);
      const moved = ProgramGridGeometry_laneDropAt(rows, 0, 1, -60, 50)!;
      expect(ProgramGridGeometry_isLaneDropNoop(moved, 0, 1)).to.equal(false);
    });

    it("swaps with a neighbour only once its centre is passed, not when it is reached", () => {
      const rows = rowsFixture();
      // Lane 1's centre is 107, lane 0's is 57. Landing exactly on 57 is still a no-op — the
      // strip has to go past its neighbour's centre to displace it.
      expect(ProgramGridGeometry_laneDropAt(rows, 0, 1, -50, 50)!.gap).to.equal(1);
      expect(ProgramGridGeometry_laneDropAt(rows, 0, 1, -51, 50)!.gap).to.equal(0);
    });
  });

  describe("dayDropAt", () => {
    it("needs half of each neighbour's own height before the target moves past it", () => {
      const rows = rowsFixture();
      // Row 0 (164) to row 1 (114) needs 82 + 57 = 139.
      expect(ProgramGridGeometry_dayDropAt(rows, 0, 138)).to.equal(0);
      expect(ProgramGridGeometry_dayDropAt(rows, 0, 139)).to.equal(1);
      expect(ProgramGridGeometry_dayDropAt(rows, 1, -139)).to.equal(0);
    });

    it("never runs past either end", () => {
      const rows = rowsFixture();
      expect(ProgramGridGeometry_dayDropAt(rows, 0, -10000)).to.equal(0);
      expect(ProgramGridGeometry_dayDropAt(rows, 0, 10000)).to.equal(1);
    });
  });

  describe("weekDropAt", () => {
    it("moves a column per column width, clamped to the program", () => {
      expect(ProgramGridGeometry_weekDropAt(4, 1, 100, 100)).to.equal(2);
      expect(ProgramGridGeometry_weekDropAt(4, 1, 49, 100)).to.equal(1);
      expect(ProgramGridGeometry_weekDropAt(4, 1, -200, 100)).to.equal(0);
      expect(ProgramGridGeometry_weekDropAt(4, 1, 10000, 100)).to.equal(3);
    });
  });

  describe("laneSegments", () => {
    it("gives a run one segment and leaves the weeks it doesn't reach as holes", () => {
      const grid = buildGrid(`# Week 1
## Day 1
Squat[1-2] / 3x5 100lb

# Week 2
## Day 1

# Week 3
## Day 1
`);
      const segments = ProgramGridGeometry_laneSegments(grid, 0, 0);
      expect(segments.map((s) => `${s.placement?.fullName ?? "-"}x${s.span}`)).to.deep.equal(["Squatx2", "-x1"]);
    });
  });

  describe("weekLaneNames", () => {
    it("repeats a spanning run into every column it covers", () => {
      const grid = buildGrid(`# Week 1
## Day 1
Squat[1-2] / 3x5 100lb

# Week 2
## Day 1
`);
      const rows = ProgramGridGeometry_build(grid, [], 50, 16);
      const names = ProgramGridGeometry_weekLaneNames(grid, rows);
      expect(names[0][0]).to.deep.equal(["Squat"]);
      expect(names[1][0]).to.deep.equal(["Squat"]);
    });
  });

  describe("clampWeek", () => {
    it("never ends before it starts nor past the last week", () => {
      const grid = buildGrid(`# Week 1
## Day 1
Squat / 3x5 100lb

# Week 2
## Day 1
`);
      const placement = grid.placements[0];
      expect(ProgramGridGeometry_clampWeek(grid, placement, 5)).to.equal(1);
      expect(ProgramGridGeometry_clampWeek(grid, placement, -5)).to.equal(placement.colStart);
    });
  });

  describe("resize handle", () => {
    // The handle sits at the run's trailing edge, inset so it stays inside the cell rather than
    // straddling the boundary with the next column.
    it("sits inside the last column the run covers", () => {
      const left = ProgramGridGeometry_resizeHandleLeft({ colEnd: 0, columnWidth: 100, rem: 16 });
      expect(left).to.equal(100 - GRID_CELL_INSET_X * 16 - GRID_RESIZE_HANDLE_WIDTH * 16);
      expect(left).to.be.lessThan(100);
    });

    it("moves one column right for each extra week the run spans", () => {
      const one = ProgramGridGeometry_resizeHandleLeft({ colEnd: 0, columnWidth: 100, rem: 16 });
      const three = ProgramGridGeometry_resizeHandleLeft({ colEnd: 2, columnWidth: 100, rem: 16 });
      expect(three - one).to.equal(200);
    });

    it("scales its inset with rem, so the Appearance slider moves it too", () => {
      const small = ProgramGridGeometry_resizeHandleLeft({ colEnd: 0, columnWidth: 100, rem: 8 });
      const large = ProgramGridGeometry_resizeHandleLeft({ colEnd: 0, columnWidth: 100, rem: 16 });
      expect(large).to.be.lessThan(small);
    });
  });
});
