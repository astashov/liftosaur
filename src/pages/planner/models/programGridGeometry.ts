import { IProgramGrid, IProgramGridPlacement, ProgramGrid_laneNames } from "./programGrid";

// Where the grid's boxes sit, and what a pointer position means. Everything here is pure arithmetic
// over the layout model, deliberately outside the components: a drop target can only be exercised
// through a live gesture, which is exactly the thing that can't be driven from a test, and every
// bug this file has had so far (an off-by-one indicator, a gap confused for an index) lived in the
// few lines that decide where a drag lands.
//
// Sizes are in rem multiples, resolved against the caller's `rem` — the app's font scale slider
// moves it, so nothing here may hardcode pixels.
export const GRID_BASE_COLUMN_WIDTH = 9.5;
// Below this a column is too narrow to say anything useful with numbers, so cells shed their scheme
// and show names only — zoomed all the way out is the whole-program structure view, not a mode.
export const GRID_SCHEME_MIN_WIDTH = 7.5;
export const GRID_LANE_HEIGHT_WITH_SCHEME = 3.25;
export const GRID_LANE_HEIGHT_NAME_ONLY = 2;
// Up to this many weeks, columns divide the available width instead of scrolling.
export const GRID_WEEKS_THAT_FIT = 2;
// A day box is inset from its column by DAY_BOX_INSET (so neighbouring boxes are separated by twice
// that), and a strip is inset by CELL_INSET — the difference between them is the breathing room
// *inside* the box, and BOTTOM_GAP keeps the same room under the last strip.
export const GRID_DAY_BOX_INSET = 0.1875;
export const GRID_CELL_INSET_X = 0.4375;
export const GRID_CELL_INSET_Y = 0.1875;
export const GRID_BOTTOM_GAP = 0.25;
export const GRID_ADD_ROW_HEIGHT = 1.5;
export const GRID_DAY_LABEL_HEIGHT = 2;
export const GRID_RESIZE_HANDLE_WIDTH = 1;
export const GRID_MARGIN_BETWEEN_ROWS = 0.25;
// The "+ Week" button is a full-height rail past the last column rather than a column-wide box, so
// it costs the horizontal scroll almost nothing and reads as "the grid continues this way".
export const GRID_ADD_WEEK_WIDTH = 3;

export interface IGridGeometryRow {
  top: number;
  height: number;
  outerHeight: number;
  // Top of lane 0, i.e. under the day label.
  contentTop: number;
  laneNames: string[];
  isCollapsed: boolean;
}

export interface IGridMetrics {
  columnWidth: number;
  totalWidth: number;
  laneHeight: number;
  // Whether a cell has room for its sets and weights, or shows the exercise name alone. It was a
  // three-level `density` for a while, but only two levels were ever produced and only "any or
  // none" was ever read.
  showScheme: boolean;
  // What the pinch gesture should start from, which is the width actually in use rather than the
  // one that was asked for — a program that fits the screen has no explicit scale yet.
  scale: number;
}

// `scale` undefined means "fit the screen if the program is short enough", which is what lets a
// one- or two-week program fill the width without freezing that choice the moment the user zooms.
export function ProgramGridGeometry_metrics(args: {
  weekCount: number;
  containerWidth: number;
  scale?: number;
  rem: number;
}): IGridMetrics {
  const { weekCount, containerWidth, rem } = args;
  const base = GRID_BASE_COLUMN_WIDTH * rem;
  const autoColumnWidth = weekCount > 0 && weekCount <= GRID_WEEKS_THAT_FIT ? containerWidth / weekCount : base;
  const columnWidth = args.scale != null ? base * args.scale : autoColumnWidth;
  const showScheme = columnWidth >= GRID_SCHEME_MIN_WIDTH * rem;
  return {
    columnWidth,
    totalWidth: columnWidth * weekCount,
    laneHeight: (showScheme ? GRID_LANE_HEIGHT_WITH_SCHEME : GRID_LANE_HEIGHT_NAME_ONLY) * rem,
    showScheme,
    scale: columnWidth / base,
  };
}

export function ProgramGridGeometry_build(
  grid: IProgramGrid,
  collapsedRows: number[],
  laneHeight: number,
  rem: number
): IGridGeometryRow[] {
  const labelHeight = GRID_DAY_LABEL_HEIGHT * rem;
  const addHeight = GRID_ADD_ROW_HEIGHT * rem;
  let top = 0;
  return grid.rows.map((row) => {
    const isCollapsed = collapsedRows.indexOf(row.rowIndex) !== -1;
    // Carried for drawing — the ghosts render these. Anything deciding *which* exercise an edit is
    // about asks the model instead, via ProgramGrid_laneNames.
    const laneNames = ProgramGrid_laneNames(grid, row.rowIndex);
    const lanes = laneNames.length;
    // The row is taller than its content by the box's own padding, so the last strip clears the
    // bottom edge by the same gap it keeps from the sides.
    const height = isCollapsed
      ? labelHeight + GRID_BOTTOM_GAP * rem
      : labelHeight + lanes * laneHeight + addHeight + GRID_BOTTOM_GAP * rem;
    const result: IGridGeometryRow = {
      top,
      height,
      outerHeight: height + GRID_MARGIN_BETWEEN_ROWS * rem,
      contentTop: top + labelHeight,
      laneNames,
      isCollapsed,
    };
    top += result.outerHeight;
    return result;
  });
}

export function ProgramGridGeometry_totalHeight(rows: IGridGeometryRow[]): number {
  return rows.reduce((acc, row) => acc + row.outerHeight, 0);
}

// The gap a move lands in, counted in the list's *current* positions: gap N sits above item N, and
// gap `count` sits below the last one. Not the destination index — an item is lifted out before it
// lands, so moving item 0 to index 1 leaves it after item 1, and the line belongs below item 1.
export function ProgramGridGeometry_gapForMove(from: number, to: number): number {
  return to === from ? -1 : to > from ? to + 1 : to;
}

// The inverse: which index a drop into `gap` ends up at once the item has been lifted out.
export function ProgramGridGeometry_indexForGap(from: number, gap: number): number {
  return gap > from ? gap - 1 : gap;
}

export interface IGridLaneDrop {
  toRow: number;
  // Insert position among the target row's lanes, 0..lanes.
  gap: number;
}

// An exercise chases the finger by its own centre, so the drop follows what you see rather than
// where you happened to grab the strip.
export function ProgramGridGeometry_laneDropAt(
  rows: IGridGeometryRow[],
  fromRow: number,
  fromLane: number,
  translationY: number,
  laneHeight: number
): IGridLaneDrop | undefined {
  const source = rows[fromRow];
  if (source == null) {
    return undefined;
  }
  const y = source.contentTop + (fromLane + 0.5) * laneHeight + translationY;
  let toRow = 0;
  for (let i = 0; i < rows.length; i += 1) {
    if (y >= rows[i].top) {
      toRow = i;
    }
  }
  const target = rows[toRow];
  // A collapsed row shows no lanes to aim between, so anything dropped on it goes to the end.
  const gap = target.isCollapsed
    ? target.laneNames.length
    : Math.max(0, Math.min(target.laneNames.length, Math.round((y - target.contentTop) / laneHeight)));
  return { toRow, gap };
}

// True when a lane drop would put the strip back where it already is: within its own row, both the
// gap above it and the gap below it are its current position.
export function ProgramGridGeometry_isLaneDropNoop(drop: IGridLaneDrop, fromRow: number, fromLane: number): boolean {
  return drop.toRow === fromRow && (drop.gap === fromLane || drop.gap === fromLane + 1);
}

// Rows have different heights, so each neighbour needs its own distance travelled before the drop
// target moves past it — half of its height plus half of the one before it.
export function ProgramGridGeometry_dayDropAt(rows: IGridGeometryRow[], fromRow: number, translationY: number): number {
  let to = fromRow;
  let travelled = 0;
  const step = translationY > 0 ? 1 : -1;
  for (let i = fromRow + step; i >= 0 && i < rows.length; i += step) {
    travelled += (rows[i]?.outerHeight ?? 0) / 2 + (rows[i - step]?.outerHeight ?? 0) / 2;
    if (Math.abs(translationY) < travelled) {
      break;
    }
    to = i;
  }
  return to;
}

// Columns are all one width, so unlike the day rows this is a single division.
export function ProgramGridGeometry_weekDropAt(
  weekCount: number,
  fromWeek: number,
  translationX: number,
  columnWidth: number
): number {
  return Math.max(0, Math.min(weekCount - 1, fromWeek + Math.round(translationX / columnWidth)));
}

export interface IGridLaneSegment {
  placement?: IProgramGridPlacement;
  span: number;
}

// One lane across every week: a run occupies its whole span as a single segment, and the weeks it
// doesn't reach are one-week holes.
export function ProgramGridGeometry_laneSegments(
  grid: IProgramGrid,
  rowIndex: number,
  laneIndex: number
): IGridLaneSegment[] {
  const placements = grid.placements.filter((p) => p.rowIndex === rowIndex && p.laneIndex === laneIndex);
  const result: IGridLaneSegment[] = [];
  let weekIndex = 0;
  while (weekIndex < grid.columns.length) {
    const placement = placements.find((p) => p.colStart === weekIndex);
    if (placement != null) {
      result.push({ placement, span: placement.colEnd - placement.colStart + 1 });
      weekIndex = placement.colEnd + 1;
    } else {
      result.push({ span: 1 });
      weekIndex += 1;
    }
  }
  return result;
}

// What each week holds, by row and lane — the week ghost's contents. A run spanning several weeks
// appears in every column it covers, because that is what the week prescribes there.
export function ProgramGridGeometry_weekLaneNames(grid: IProgramGrid, rows: IGridGeometryRow[]): string[][][] {
  return grid.columns.map((column) =>
    rows.map((row, rowIndex) => {
      const names = Array.from({ length: row.laneNames.length }, () => "");
      for (const placement of grid.placements) {
        if (
          placement.rowIndex === rowIndex &&
          placement.colStart <= column.weekIndex &&
          placement.colEnd >= column.weekIndex
        ) {
          names[placement.laneIndex] = placement.fullName;
        }
      }
      return names;
    })
  );
}

// A run can never end before it starts, nor past the last week. The row being ragged doesn't
// constrain it — a repeat simply stops at the last week that has this day.
export function ProgramGridGeometry_clampWeek(
  grid: IProgramGrid,
  placement: IProgramGridPlacement,
  deltaWeeks: number
): number {
  return Math.max(placement.colStart, Math.min(grid.columns.length - 1, placement.colEnd + deltaWeeks));
}

// Where the resize handle sits: the right edge of the run's card, following the preview while a
// resize is in flight.
export function ProgramGridGeometry_resizeHandleLeft(args: {
  colEnd: number;
  columnWidth: number;
  rem: number;
}): number {
  return args.columnWidth * (args.colEnd + 1) - GRID_CELL_INSET_X * args.rem - GRID_RESIZE_HANDLE_WIDTH * args.rem;
}
