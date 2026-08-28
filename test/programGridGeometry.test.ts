import "mocha";
import { expect } from "chai";
import {
  GRID_ADD_WEEK_WIDTH,
  GRID_BASE_COLUMN_WIDTH,
  IGridGeometryRow,
  ProgramGridGeometry_build,
  ProgramGridGeometry_canResize,
  ProgramGridGeometry_clampWeek,
  ProgramGridGeometry_resizeHandleLeft,
  GRID_CELL_INSET_X,
  GRID_DAY_DURATION_HEIGHT,
  GRID_DAY_LABEL_HEIGHT,
  ProgramGridGeometry_dayLabelHeight,
  GRID_RESIZE_HANDLE_WIDTH,
  GRID_RESIZE_HANDLE_HIT_WIDTH,
  GRID_RESIZE_HANDLE_MAX_HIT_SHARE,
  ProgramGridGeometry_resizeHitLeft,
  ProgramGridGeometry_resizeHitWidth,
  ProgramGridGeometry_dayBlockDropAt,
  ProgramGridGeometry_gapForMove,
  ProgramGridGeometry_insertAtForGap,
  ProgramGridGeometry_isBlockDropNoop,
  ProgramGridGeometry_laneDropAt,
  ProgramGridGeometry_moveBlock,
  ProgramGridGeometry_laneSegments,
  ProgramGridGeometry_metrics,
  ProgramGridGeometry_weekDropAt,
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
// row 0 = 32 (label) + 100 (lanes) + 24 (add) + 7 (gap) = 163, +4 margin = 167
// row 1 = 32 + 50 + 24 + 7 = 113, +4 margin = 117
//
// Built without the scheme, so the label is the bare one and the arithmetic above is the whole of
// it — the duration line's own effect on the height has its own tests below.
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
    16,
    false
  );
}

function threeRowsFixture(): IGridGeometryRow[] {
  return ProgramGridGeometry_build(
    buildGrid(`# Week 1
## Day 1
Squat / 3x5 100lb

## Day 2
Bench Press / 5x5 50lb

## Day 3
Deadlift / 1x5 200lb
`),
    [],
    50,
    16,
    false
  );
}

describe("ProgramGridGeometry", () => {
  describe("build", () => {
    it("stacks rows by their own content height", () => {
      const rows = rowsFixture();
      expect(rows).to.have.length(2);
      expect(rows[0].top).to.equal(0);
      expect(rows[0].height).to.equal(163);
      expect(rows[0].outerHeight).to.equal(167);
      expect(rows[0].contentTop).to.equal(32);
      expect(rows[0].laneNames).to.deep.equal(["Squat", "Bench Press"]);
      // The second row starts below the first, margin included.
      expect(rows[1].top).to.equal(167);
      expect(rows[1].laneNames).to.deep.equal(["Deadlift"]);
    });

    it("collapses a row to its label, and the rows below move up", () => {
      const grid = buildGrid(`# Week 1
## Day 1
Squat / 3x5 100lb
Bench Press / 5x5 50lb

## Day 2
Deadlift / 1x5 200lb
`);
      const rows = ProgramGridGeometry_build(grid, [0], 50, 16, false);
      expect(rows[0].height).to.equal(39);
      expect(rows[0].isCollapsed).to.equal(true);
      // Still knows its lanes — the ghost draws them even while the row itself is collapsed.
      expect(rows[0].laneNames).to.deep.equal(["Squat", "Bench Press"]);
      expect(rows[1].top).to.equal(43);
    });

    it("makes room under the day name for how long it takes, and only where it is shown", () => {
      const grid = buildGrid(`# Week 1
## Day 1
Squat / 3x5 100lb

## Day 2
Deadlift / 1x5 200lb
`);
      const withDuration = ProgramGridGeometry_build(grid, [1], 50, 16, true);
      const bare = ProgramGridGeometry_build(grid, [1], 50, 16, false);
      const line = GRID_DAY_DURATION_HEIGHT * 16;
      expect(withDuration[0].contentTop - bare[0].contentTop).to.equal(line);
      expect(withDuration[0].height - bare[0].height).to.equal(line);
      // A collapsed row is a name and nothing else, so it is the same height either way — and the
      // row below it moves down only by what the row above actually grew.
      expect(withDuration[1].height).to.equal(bare[1].height);
      expect(withDuration[1].top - bare[1].top).to.equal(line);
    });
  });

  describe("dayLabelHeight", () => {
    it("adds the duration line only to an expanded row in a grid that shows numbers", () => {
      const bare = GRID_DAY_LABEL_HEIGHT * 16;
      expect(ProgramGridGeometry_dayLabelHeight(16, { isCollapsed: false, showScheme: true })).to.equal(
        bare + GRID_DAY_DURATION_HEIGHT * 16
      );
      expect(ProgramGridGeometry_dayLabelHeight(16, { isCollapsed: true, showScheme: true })).to.equal(bare);
      expect(ProgramGridGeometry_dayLabelHeight(16, { isCollapsed: false, showScheme: false })).to.equal(bare);
    });
  });

  describe("metrics", () => {
    it("divides the width between one or two weeks, and scrolls from three", () => {
      // What is divided is the width left over once the "+ Week" rail has had its share, so the rail
      // stays on screen instead of sitting just past its right edge.
      const fit = ProgramGridGeometry_metrics({ weekCount: 2, containerWidth: 400, rem: 16 });
      expect(fit.columnWidth).to.equal((400 - GRID_ADD_WEEK_WIDTH * 16) / 2);
      expect(fit.totalWidth + GRID_ADD_WEEK_WIDTH * 16).to.equal(400);
      const scroll = ProgramGridGeometry_metrics({ weekCount: 3, containerWidth: 400, rem: 16 });
      expect(scroll.columnWidth).to.equal(GRID_BASE_COLUMN_WIDTH * 16);
    });

    it("fills a container with room to spare, however many weeks it holds", () => {
      // The desktop case: three columns at the base width leave most of the screen empty, so they
      // divide it instead — and the rail still lands exactly on the right edge.
      const wide = ProgramGridGeometry_metrics({ weekCount: 3, containerWidth: 1400, rem: 16 });
      expect(wide.columnWidth).to.equal((1400 - GRID_ADD_WEEK_WIDTH * 16) / 3);
      expect(wide.totalWidth + GRID_ADD_WEEK_WIDTH * 16).to.equal(1400);
    });

    it("scrolls rather than shrinking past two weeks", () => {
      // Same container, more weeks than fit in it: dividing would give slivers, so the base width
      // holds and the grid scrolls. Only one or two weeks may shrink to avoid that scroll.
      const many = ProgramGridGeometry_metrics({ weekCount: 12, containerWidth: 1400, rem: 16 });
      expect(many.columnWidth).to.equal(GRID_BASE_COLUMN_WIDTH * 16);
      const two = ProgramGridGeometry_metrics({ weekCount: 2, containerWidth: 320, rem: 16 });
      expect(two.columnWidth).to.equal((320 - GRID_ADD_WEEK_WIDTH * 16) / 2);
      expect(two.columnWidth).to.be.lessThan(GRID_BASE_COLUMN_WIDTH * 16);
    });

    it("keeps a column positive before the container has been laid out", () => {
      const unmeasured = ProgramGridGeometry_metrics({ weekCount: 2, containerWidth: 0, rem: 16 });
      expect(unmeasured.columnWidth).to.equal(GRID_BASE_COLUMN_WIDTH * 16);
    });

    it("an explicit scale wins over fitting", () => {
      const metrics = ProgramGridGeometry_metrics({ weekCount: 2, containerWidth: 400, scale: 0.6, rem: 16 });
      expect(metrics.columnWidth).to.equal(GRID_BASE_COLUMN_WIDTH * 0.6 * 16);
      expect(metrics.scale).to.equal(0.6);
    });

    it("drops the scheme and shrinks the lanes once a column gets narrow", () => {
      const wide = ProgramGridGeometry_metrics({ weekCount: 3, containerWidth: 400, scale: 1, rem: 16 });
      expect(wide.showScheme).to.equal(true);
      expect(wide.laneHeight).to.equal(3.25 * 16);
      const narrow = ProgramGridGeometry_metrics({ weekCount: 3, containerWidth: 400, scale: 0.6, rem: 16 });
      expect(narrow.showScheme).to.equal(false);
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
          expect(ProgramGridGeometry_insertAtForGap([from], ProgramGridGeometry_gapForMove(from, to))).to.equal(to);
        }
      }
    });

    it("moves a block into a gap, keeping its own order", () => {
      const items = ["a", "b", "c", "d"];
      expect(ProgramGridGeometry_moveBlock(items, [0, 2], 4)).to.deep.equal(["b", "d", "a", "c"]);
      expect(ProgramGridGeometry_moveBlock(items, [1, 3], 0)).to.deep.equal(["b", "d", "a", "c"]);
      // The gap counts the original positions, so one taken by a member of the block still means
      // "above what used to be here".
      expect(ProgramGridGeometry_moveBlock(items, [2, 3], 1)).to.deep.equal(["a", "c", "d", "b"]);
    });

    it("knows when a drop changes nothing", () => {
      // Anywhere inside a contiguous block, or at either of its edges, is where it already is.
      expect(ProgramGridGeometry_isBlockDropNoop(4, [1, 2], 1)).to.equal(true);
      expect(ProgramGridGeometry_isBlockDropNoop(4, [1, 2], 2)).to.equal(true);
      expect(ProgramGridGeometry_isBlockDropNoop(4, [1, 2], 3)).to.equal(true);
      expect(ProgramGridGeometry_isBlockDropNoop(4, [1, 2], 4)).to.equal(false);
      expect(ProgramGridGeometry_isBlockDropNoop(4, [1, 2], 0)).to.equal(false);
      // A scattered selection always changes something, since dropping it puts it together.
      expect(ProgramGridGeometry_isBlockDropNoop(4, [0, 2], 0)).to.equal(false);
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
      // Where the ghost is *drawn* is not part of the drop target — the drag computes it from the
      // translation, because it follows the finger rather than the lane the drop snaps to.
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
      const rows = ProgramGridGeometry_build(grid, [1], 50, 16, false);
      const drop = ProgramGridGeometry_laneDropAt(rows, 0, 0, 200, 50)!;
      expect(drop.toRow).to.equal(1);
      expect(drop.gap).to.equal(rows[1].laneNames.length);
    });

    it("knows when a drop would change nothing", () => {
      const rows = rowsFixture();
      const stay = ProgramGridGeometry_laneDropAt(rows, 0, 1, 0, 50)!;
      expect(ProgramGridGeometry_isBlockDropNoop(2, [1], stay.gap)).to.equal(true);
      const moved = ProgramGridGeometry_laneDropAt(rows, 0, 1, -60, 50)!;
      expect(ProgramGridGeometry_isBlockDropNoop(2, [1], moved.gap)).to.equal(false);
    });

    it("swaps with a neighbour only once its centre is passed, not when it is reached", () => {
      const rows = rowsFixture();
      // Lane 1's centre is 107, lane 0's is 57. Landing exactly on 57 is still a no-op — the
      // strip has to go past its neighbour's centre to displace it.
      expect(ProgramGridGeometry_laneDropAt(rows, 0, 1, -50, 50)!.gap).to.equal(1);
      expect(ProgramGridGeometry_laneDropAt(rows, 0, 1, -51, 50)!.gap).to.equal(0);
    });
  });

  describe("dayBlockDropAt", () => {
    it("passes a neighbour at its centre, which is half of each of the two rows away", () => {
      const rows = rowsFixture();
      // Row 0's centre is 81.5, row 1's is 223.5, so row 0 passes it after 142.
      expect(ProgramGridGeometry_dayBlockDropAt(rows, [0], 142)).to.equal(1);
      expect(ProgramGridGeometry_isBlockDropNoop(2, [0], 1)).to.equal(true);
      expect(ProgramGridGeometry_dayBlockDropAt(rows, [0], 143)).to.equal(2);
      expect(ProgramGridGeometry_dayBlockDropAt(rows, [1], -142)).to.equal(0);
    });

    it("never runs past either end", () => {
      const rows = rowsFixture();
      // Dragged off the top, the first row lands above the one below it — where it already is.
      expect(ProgramGridGeometry_dayBlockDropAt(rows, [0], -10000)).to.equal(1);
      expect(ProgramGridGeometry_isBlockDropNoop(2, [0], 1)).to.equal(true);
      expect(ProgramGridGeometry_dayBlockDropAt(rows, [0], 10000)).to.equal(2);
    });

    it("measures a block from its leading row and ignores its own members", () => {
      const rows = threeRowsFixture();
      // Rows are 117 apart, centres at 56.5, 173.5, 290.5. Dragging rows 0 and 1 down, it is row 1
      // that has to pass row 2's centre — one row's travel, not two.
      expect(ProgramGridGeometry_dayBlockDropAt(rows, [0, 1], 117)).to.equal(2);
      expect(ProgramGridGeometry_isBlockDropNoop(3, [0, 1], 2)).to.equal(true);
      expect(ProgramGridGeometry_dayBlockDropAt(rows, [0, 1], 118)).to.equal(3);
      // And going up it is the first of them, so the same travel puts the block above row 0.
      expect(ProgramGridGeometry_dayBlockDropAt(rows, [1, 2], -117)).to.equal(0);
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

  describe("canResize", () => {
    it("is false for a run with no week to be dragged to", () => {
      const grid = buildGrid(`# Week 1
## Day 1
Squat / 3x5 100lb
`);
      expect(ProgramGridGeometry_canResize(grid, grid.placements[0])).to.equal(false);
    });

    it("is true where the run can still grow, and where it can only shrink", () => {
      const grid = buildGrid(`# Week 1
## Day 1
Squat / 3x5 100lb
Bench Press / 3x5 100lb

# Week 2
## Day 1
Squat / 3x5 100lb
Bench Press / 3x5 100lb

# Week 3
## Day 1
Bench Press / 3x5 100lb
Deadlift / 3x5 100lb
`);
      const squat = grid.placements.find((p) => p.fullName === "Squat")!;
      expect([squat.colStart, squat.colEnd]).to.deep.equal([0, 1]);
      expect(ProgramGridGeometry_canResize(grid, squat)).to.equal(true);
      // Already at the last week, but three weeks long — dragging back is still somewhere to go.
      const bench = grid.placements.find((p) => p.fullName === "Bench Press")!;
      expect([bench.colStart, bench.colEnd]).to.deep.equal([0, 2]);
      expect(ProgramGridGeometry_canResize(grid, bench)).to.equal(true);
      // One week long, in the last week: both directions are already clamped to where it is.
      const deadlift = grid.placements.find((p) => p.fullName === "Deadlift")!;
      expect([deadlift.colStart, deadlift.colEnd]).to.deep.equal([2, 2]);
      expect(ProgramGridGeometry_canResize(grid, deadlift)).to.equal(false);
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

    it("takes touches from a box wider than the grip, centred on it", () => {
      const grip = ProgramGridGeometry_resizeHandleLeft({ colEnd: 0, columnWidth: 152, rem: 16 });
      const hitWidth = ProgramGridGeometry_resizeHitWidth(152, 16);
      const hitLeft = ProgramGridGeometry_resizeHitLeft({ colEnd: 0, columnWidth: 152, rem: 16 });
      expect(hitWidth).to.be.greaterThan(GRID_RESIZE_HANDLE_WIDTH * 16);
      expect(hitLeft + hitWidth / 2).to.equal(grip + (GRID_RESIZE_HANDLE_WIDTH * 16) / 2);
    });

    // It may reach into the gap between two strips, but not onto the card on the other side of it,
    // where it would be taking taps meant for the next week's exercise.
    it("stops short of the next column's card", () => {
      for (const columnWidth of [68, 100, 152, 300]) {
        const hitLeft = ProgramGridGeometry_resizeHitLeft({ colEnd: 1, columnWidth, rem: 16 });
        const right = hitLeft + ProgramGridGeometry_resizeHitWidth(columnWidth, 16);
        expect(right).to.be.lessThan(columnWidth * 2 + GRID_CELL_INSET_X * 16);
      }
    });

    // Zoomed all the way out a fixed-size box would be half the strip, so the cap takes over — and
    // even then it is no smaller than the grip it replaces.
    it("never spends more than its share of a narrow column, nor less than the grip", () => {
      expect(ProgramGridGeometry_resizeHitWidth(68, 16)).to.be.lessThan(GRID_RESIZE_HANDLE_HIT_WIDTH * 16);
      expect(ProgramGridGeometry_resizeHitWidth(68, 16)).to.be.greaterThan(GRID_RESIZE_HANDLE_WIDTH * 16);
      expect(ProgramGridGeometry_resizeHitWidth(68, 16) / 68).to.be.at.most(GRID_RESIZE_HANDLE_MAX_HIT_SHARE);
    });

    it("scales its inset with rem, so the Appearance slider moves it too", () => {
      const small = ProgramGridGeometry_resizeHandleLeft({ colEnd: 0, columnWidth: 100, rem: 8 });
      const large = ProgramGridGeometry_resizeHandleLeft({ colEnd: 0, columnWidth: 100, rem: 16 });
      expect(large).to.be.lessThan(small);
    });
  });
});
