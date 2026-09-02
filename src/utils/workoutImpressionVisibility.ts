export interface IWorkoutImpressionVisibilityArgs {
  // Relative to the scroll viewport, not the window.
  top: number;
  height: number;
  viewportHeight: number;
  stickyHeaderHeight: number;
}

// Seen means the whole block, not a sliver: an exercise with few sets leaves the graph's top edge
// right at the fold.
export function WorkoutImpressionVisibility_isSeen(args: IWorkoutImpressionVisibilityArgs): boolean {
  const { top, height, viewportHeight, stickyHeaderHeight } = args;
  if (height <= 0 || viewportHeight <= 0) {
    return false;
  }
  const available = Math.max(0, viewportHeight - stickyHeaderHeight);
  const shownTop = Math.max(top, stickyHeaderHeight);
  const shownBottom = Math.min(top + height, viewportHeight);
  const shown = Math.max(0, shownBottom - shownTop);
  // A block taller than the viewport can never fit, so for those, filling it counts.
  return shown >= Math.min(height, available) - 1;
}
