export interface IWorkoutCenterScrollInput {
  scrollY: number;
  rowTop: number;
  rowHeight: number;
  viewportTop: number;
  viewportHeight: number;
  stickyHeaderHeight: number;
  footerHeight: number;
  contentHeight: number;
}

export function WorkoutCenterScroll_targetY(input: IWorkoutCenterScrollInput): number {
  const visibleHeight = input.viewportHeight - input.stickyHeaderHeight - input.footerHeight;
  const visibleCenter = input.stickyHeaderHeight + visibleHeight / 2;
  const rowCenter = input.rowTop - input.viewportTop + input.rowHeight / 2;
  const maxY = Math.max(0, input.contentHeight - input.viewportHeight);
  return Math.round(Math.min(maxY, Math.max(0, input.scrollY + rowCenter - visibleCenter)));
}
