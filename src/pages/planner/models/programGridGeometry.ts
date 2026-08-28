import { IProgramGrid, IProgramGridPlacement, ProgramGrid_laneNames } from "./programGrid";

// Where the grid's boxes sit, and what a pointer position means. Everything here is pure arithmetic
// over the layout model, deliberately outside the components: every bug this file has had so far
// (an off-by-one indicator, a gap confused for an index) lived in the few lines that decide where a
// drag lands, and those are worth checking one gap at a time rather than only through the gesture
// that reaches them.
//
// Sizes are in rem multiples, resolved against the caller's `rem` — the app's font scale slider
// moves it, so nothing here may hardcode pixels.
export const GRID_BASE_COLUMN_WIDTH = 9.5;
// Below this a column is too narrow to say anything useful with numbers, so cells shed their scheme
// and show names only — zoomed all the way out is the whole-program structure view, not a mode.
export const GRID_SCHEME_MIN_WIDTH = 7.5;
export const GRID_LANE_HEIGHT_WITH_SCHEME = 3.25;
export const GRID_LANE_HEIGHT_NAME_ONLY = 2;
// Up to this many weeks, columns may divide the available width even when that makes them narrower
// than the base. Wider programs still stretch to fill a screen with room to spare — they just never
// shrink to do it.
export const GRID_WEEKS_THAT_FIT = 2;
// A day box is inset from its column by DAY_BOX_INSET (so neighbouring boxes are separated by twice
// that), and a strip is inset by CELL_INSET — the difference between them is the breathing room
// *inside* the box, and BOTTOM_GAP keeps the same room under the last strip.
//
// BOTTOM_GAP is measured from the row's edge while the box's border sits DAY_BOX_INSET inside it,
// so matching CELL_INSET_X leaves exactly the same gap below the last strip as beside it. It read
// as CELL_INSET_X - DAY_BOX_INSET for a while, one pixel, which put "+ Exercise" on the border.
export const GRID_DAY_BOX_INSET = 0.1875;
export const GRID_CELL_INSET_X = 0.4375;
export const GRID_CELL_INSET_Y = 0.1875;
export const GRID_BOTTOM_GAP = GRID_CELL_INSET_X;
export const GRID_ADD_ROW_HEIGHT = 1.5;
export const GRID_DAY_LABEL_HEIGHT = 2;
// The line under the day's name that says how long it takes. A collapsed row is a name and nothing
// else, and a zoomed-out grid has already given up its numbers — so both keep the bare label.
export const GRID_DAY_DURATION_HEIGHT = 0.875;

export function ProgramGridGeometry_dayLabelHeight(
  rem: number,
  args: { isCollapsed: boolean; showScheme: boolean }
): number {
  const duration = !args.isCollapsed && args.showScheme ? GRID_DAY_DURATION_HEIGHT : 0;
  return (GRID_DAY_LABEL_HEIGHT + duration) * rem;
}
export const GRID_RESIZE_HANDLE_WIDTH = 1;
// The grip is drawn a rem wide; the touch box around it is wider, because a target that narrow at
// the edge of a strip is one fingers miss — and a miss lands on the strip, whose long press starts
// dragging the exercise somewhere else entirely. Capped as a share of the column so a zoomed-out
// grid doesn't hand half of every strip over to its own edge; at the narrowest column the cap is
// still wider than the grip.
export const GRID_RESIZE_HANDLE_HIT_WIDTH = 2.25;
export const GRID_RESIZE_HANDLE_MAX_HIT_SHARE = 0.3;
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
  // Fitting divides what is left *after* the "+ Week" rail, not the whole width: filling the screen
  // edge to edge pushes the rail off it, and a button you have to scroll sideways to discover is one
  // nobody knows the grid has.
  //
  // Before layout has happened there is no width to divide, and dividing zero produces a negative
  // column for the frame before onLayout arrives.
  const fitted = weekCount > 0 && containerWidth > 0 ? (containerWidth - GRID_ADD_WEEK_WIDTH * rem) / weekCount : base;
  // Stretching to fill has no week limit — a wide screen showing three narrow columns against a
  // field of nothing is the whole desktop case. *Shrinking* below the base width keeps one, because
  // that is a phone deciding a short program is worth squeezing rather than scrolling; past that
  // limit a program too wide to fit scrolls instead of dissolving into slivers.
  const autoColumnWidth = weekCount <= GRID_WEEKS_THAT_FIT ? fitted : Math.max(base, fitted);
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
  rem: number,
  showScheme: boolean
): IGridGeometryRow[] {
  const addHeight = GRID_ADD_ROW_HEIGHT * rem;
  let top = 0;
  return grid.rows.map((row) => {
    const isCollapsed = collapsedRows.indexOf(row.rowIndex) !== -1;
    const labelHeight = ProgramGridGeometry_dayLabelHeight(rem, { isCollapsed, showScheme });
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

// The gap a move lands in, counted in the list's *current* positions: gap N sits above item N, and
// gap `count` sits below the last one. Not the destination index — an item is lifted out before it
// lands, so moving item 0 to index 1 leaves it after item 1, and the line belongs below item 1.
export function ProgramGridGeometry_gapForMove(from: number, to: number): number {
  return to === from ? -1 : to > from ? to + 1 : to;
}

// A gap is counted in the list's original positions, because that is what the drop line is drawn
// against; an insert position is counted in what is left once the dragged items are lifted out,
// because that is what actually performs the move.
export function ProgramGridGeometry_insertAtForGap(moved: number[], gap: number): number {
  return gap - moved.filter((index) => index < gap).length;
}

// Dropping several items at once: they leave their old positions together and land together, in the
// order they had, which is the one thing a multi-selection drag must not scramble.
export function ProgramGridGeometry_moveBlock<T>(items: T[], moved: number[], gap: number): T[] {
  const sorted = moved.slice().sort((a, b) => a - b);
  const remaining = items.filter((_, index) => sorted.indexOf(index) === -1);
  const insertAt = Math.max(0, Math.min(remaining.length, ProgramGridGeometry_insertAtForGap(sorted, gap)));
  return [...remaining.slice(0, insertAt), ...sorted.map((index) => items[index]), ...remaining.slice(insertAt)];
}

// Whether a drop would put the block back exactly where it was — answered by building the order it
// would produce and comparing, because for several items at once there is no shorter honest test:
// a gap anywhere inside a contiguous block changes nothing, and one inside a scattered selection
// always changes something.
export function ProgramGridGeometry_isBlockDropNoop(count: number, moved: number[], gap: number): boolean {
  const order = ProgramGridGeometry_moveBlock(
    Array.from({ length: count }, (_, index) => index),
    moved,
    gap
  );
  return order.every((value, index) => value === index);
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

// Where a dragged block of rows lands, as a gap in the rows' own indexing: the first row it has not
// passed the centre of. Rows have different heights, so there is no step to divide by — each
// neighbour is passed at its own centre.
//
// Measured from the block's leading row — its last one going down, its first going up — and against
// the rows that stay. Measuring from the row the finger grabbed instead would make a block behave
// differently depending on which of its rows you took hold of, and counting its own members would
// make it travel its whole height before anything moved.
export function ProgramGridGeometry_dayBlockDropAt(
  rows: IGridGeometryRow[],
  moved: number[],
  translationY: number
): number {
  const leading = moved.reduce(
    (acc, index) => (translationY > 0 ? Math.max(acc, index) : Math.min(acc, index)),
    moved[0] ?? 0
  );
  const source = rows[leading];
  if (source == null) {
    return 0;
  }
  const center = source.top + source.outerHeight / 2 + translationY;
  for (let i = 0; i < rows.length; i += 1) {
    if (moved.indexOf(i) === -1 && rows[i].top + rows[i].outerHeight / 2 >= center) {
      return i;
    }
  }
  return rows.length;
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

// A run can never end before it starts, nor past the last week. The row being ragged doesn't
// constrain it — a repeat simply stops at the last week that has this day.
export function ProgramGridGeometry_clampWeek(
  grid: IProgramGrid,
  placement: IProgramGridPlacement,
  deltaWeeks: number
): number {
  return Math.max(placement.colStart, Math.min(grid.columns.length - 1, placement.colEnd + deltaWeeks));
}

// The other end of `clampWeek`: a run that starts in the last week is already clamped to the only
// week it can end in, so a handle on it is a grip on nothing. Extending is the direction that runs
// out — the lane's later weeks are free by construction, since a run that had another after it
// wouldn't be the one carrying the handle.
export function ProgramGridGeometry_canResize(grid: IProgramGrid, placement: IProgramGridPlacement): boolean {
  return placement.colStart < grid.columns.length - 1;
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

export function ProgramGridGeometry_resizeHitWidth(columnWidth: number, rem: number): number {
  return Math.min(GRID_RESIZE_HANDLE_HIT_WIDTH * rem, columnWidth * GRID_RESIZE_HANDLE_MAX_HIT_SHARE);
}

// Centred on the grip rather than starting where it does, so a wider touch box doesn't move the
// thing it's a target for. It reaches past the run's trailing edge into the gap between strips,
// which nothing else claims, and stops short of the next column's card.
export function ProgramGridGeometry_resizeHitLeft(args: { colEnd: number; columnWidth: number; rem: number }): number {
  const gripCenter = ProgramGridGeometry_resizeHandleLeft(args) + (GRID_RESIZE_HANDLE_WIDTH * args.rem) / 2;
  return gripCenter - ProgramGridGeometry_resizeHitWidth(args.columnWidth, args.rem) / 2;
}
