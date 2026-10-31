export interface IWorkoutPagerSettleArgs {
  offsetX: number;
  pageWidth: number;
  isUserDriven: boolean;
  // Where the gesture started, not where the pager last settled: nothing outside a gesture keeps
  // a last-settled value current, so it drops a swipe back to a page reached by tapping.
  dragStartIndex: number;
}

export function WorkoutPagerSettle_index(args: IWorkoutPagerSettleArgs): number | undefined {
  const { offsetX, pageWidth, isUserDriven, dragStartIndex } = args;
  if (!isUserDriven || pageWidth <= 0) {
    return undefined;
  }
  const index = Math.max(0, Math.floor((offsetX + pageWidth / 2) / pageWidth));
  if (index === dragStartIndex) {
    return undefined;
  }
  return index;
}
