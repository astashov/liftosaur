import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { NavScreenScrollContext } from "../../../navigation/NavScreenScrollContext";
import { IProgramGrid, IProgramGridPlacement, IProgramGridSelection } from "../../../pages/planner/models/programGrid";
import { IGridGeometryRow } from "../../../pages/planner/models/programGridGeometry";

// "...main" tells you an exercise reuses another one; it doesn't tell you *where* that one is. The
// grid already lights the source up when its reuser is selected, which answers the question only
// when both happen to be on screen — and on any real program they usually aren't. So when the
// source has scrolled out of view, say which way it went.
//
// Only one direction is ever reported, because only one is ever useful: the question is "which way
// do I scroll", and a source that is already visible needs no answer at all.
export type IGridReuseDirection = "up" | "down";

export interface IGridReuseLocator {
  name: string;
  direction: IGridReuseDirection;
  onGoTo: () => void;
}

// How much of the row to leave showing above the fold before it counts as off screen. A source
// whose last pixel is peeking over the edge is not something anyone can read.
const VISIBLE_MARGIN = 24;
// Where a jump puts the row: a little below the top edge, so it reads as the thing that was asked
// for rather than as content that happens to start there.
const GO_TO_MARGIN = 12;

export function useGridReuseLocator(args: {
  grid: IProgramGrid;
  geometry: IGridGeometryRow[];
  laneHeight: number;
  selection?: IProgramGridSelection;
  // Where the grid's rows begin in scroll-content coordinates, and how tall the week header that
  // pins itself over them is — both from useGridStickyHeader.
  rowsTop: number;
  headerHeight: number;
}): IGridReuseLocator | undefined {
  const { grid, geometry, laneHeight, selection, rowsTop, headerHeight } = args;
  const scrollCtx = useContext(NavScreenScrollContext);

  // What covers the top of the visible area: the screen's own sticky header, and then the grid's
  // week names pinned beneath it. Counting only the first leaves a band the height of the week row
  // that reads as visible and isn't — a strip sitting there is behind the names, and a jump aimed
  // at it lands with it still behind them.
  const occludedTop = (scrollCtx?.stickyHeaderHeight ?? 0) + headerHeight;

  // What the selection reuses, if it agrees on one thing. Several strips reusing several different
  // sources have no single answer, and pointing at one of them arbitrarily would be worse than
  // saying nothing.
  const target = useMemo((): IProgramGridPlacement | undefined => {
    const names = new Set((selection?.placements ?? []).map((p) => p.reuseOf).filter((n): n is string => n != null));
    if (names.size !== 1) {
      return undefined;
    }
    const name = [...names][0];
    // The topmost run of it. A source that repeats draws several strips, and the one to send
    // somebody to is the first — that is where its text is written.
    return grid.placements
      .filter((p) => p.fullName === name)
      .sort((a, b) => a.rowIndex - b.rowIndex || a.colStart - b.colStart)[0];
  }, [grid, selection]);

  const row = target != null ? geometry[target.rowIndex] : undefined;
  // The strip, not the row it lives in. A reuse and its source are very often in the same day —
  // `main` at the top of it and everything below reusing it — and a row is tall enough that it is
  // still partly on screen long after the strip at its top has scrolled away. Asking about the row
  // answers "no direction" for exactly the case the pill exists to serve.
  //
  // A collapsed row hides its strips, so the row itself is the target there.
  const laneTop =
    row == null || target == null ? 0 : row.isCollapsed ? row.top : row.contentTop + target.laneIndex * laneHeight;
  const rowTop = row == null ? 0 : rowsTop + laneTop;
  const rowBottom = row == null ? 0 : rowTop + (row.isCollapsed ? row.height : laneHeight);

  const [direction, setDirection] = useState<IGridReuseDirection | undefined>(undefined);
  // Read by the scroll listener, which outlives the render that installed it.
  const boundsRef = useRef({ rowTop, rowBottom });
  boundsRef.current = { rowTop, rowBottom };
  // The scroll context carries what the viewport is occluded *by*, but not how tall it is. Scroll
  // events do, and it is measured directly for the case where none has arrived yet — a grid opened
  // and a strip tapped without scrolling once.
  const viewportHeightRef = useRef(0);

  const verdict = useCallback((): IGridReuseDirection | undefined => {
    const viewport = viewportHeightRef.current;
    if (viewport <= 0) {
      return undefined;
    }
    const scrollY = scrollCtx?.scrollYRef.current ?? 0;
    const top = scrollY + occludedTop;
    const bottom = scrollY + viewport - (scrollCtx?.footerHeight ?? 0);
    const bounds = boundsRef.current;
    if (bounds.rowBottom - VISIBLE_MARGIN < top) {
      return "up";
    }
    if (bounds.rowTop + VISIBLE_MARGIN > bottom) {
      return "down";
    }
    return undefined;
  }, [scrollCtx, occludedTop]);

  // Recomputed on every scroll event but written only when the answer changes — an arrow that
  // flips at most twice in a flick, rather than a setState per frame under the finger.
  useEffect(() => {
    if (row == null) {
      setDirection(undefined);
      return;
    }
    scrollCtx?.viewportRef.current?.measureInWindow((_x, _y, _w, height) => {
      viewportHeightRef.current = height;
      setDirection(verdict());
    });
    setDirection(verdict());
    return scrollCtx?.addScrollListener((e) => {
      viewportHeightRef.current = e.nativeEvent.layoutMeasurement.height;
      setDirection((prev) => {
        const next = verdict();
        return prev === next ? prev : next;
      });
    });
  }, [row, rowTop, rowBottom, scrollCtx, verdict]);

  const onGoTo = useCallback(() => {
    const node = scrollCtx?.scrollRef.current;
    if (node == null) {
      return;
    }
    node.scrollTo({ y: Math.max(0, boundsRef.current.rowTop - occludedTop - GO_TO_MARGIN) });
  }, [scrollCtx, occludedTop]);

  return useMemo(
    () => (target == null || direction == null ? undefined : { name: target.fullName, direction, onGoTo }),
    [target, direction, onGoTo]
  );
}
