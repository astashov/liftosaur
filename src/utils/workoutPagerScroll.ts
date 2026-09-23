export interface IWorkoutPagerScrollPlan {
  animated: boolean;
  ownSlideTarget: number | undefined;
}

export interface IWorkoutPagerScrollRead {
  ownSlideTarget: number | undefined;
  reportIndex: number | undefined;
}

export function WorkoutPagerScroll_shownIndex(offsetX: number, windowWidth: number): number {
  return windowWidth > 0 ? Math.round(offsetX / windowWidth) : 0;
}

export function WorkoutPagerScroll_gestureHeight(
  pageHeights: Record<number, number>,
  startIndex: number
): number | undefined {
  const known = [startIndex - 1, startIndex, startIndex + 1]
    .map((index) => pageHeights[index])
    .filter((height): height is number => height != null);
  return known.length > 0 ? Math.max(...known) : undefined;
}

export function WorkoutPagerScroll_snapOffset(offsetX: number, windowWidth: number): number | undefined {
  if (windowWidth <= 0) {
    return undefined;
  }
  const pageOffset = WorkoutPagerScroll_shownIndex(offsetX, windowWidth) * windowWidth;
  return Math.abs(pageOffset - offsetX) >= 1 ? pageOffset : undefined;
}

export function WorkoutPagerScroll_plan(
  shownIndex: number,
  targetIndex: number,
  isNavigation: boolean
): IWorkoutPagerScrollPlan {
  const isNeighbour = Math.abs(targetIndex - shownIndex) === 1;
  const animated = isNavigation && isNeighbour;
  return { animated, ownSlideTarget: animated ? targetIndex : undefined };
}

export function WorkoutPagerScroll_read(
  ownSlideTarget: number | undefined,
  selectedIndex: number,
  currentIndex: number
): IWorkoutPagerScrollRead {
  if (ownSlideTarget != null) {
    return { ownSlideTarget: selectedIndex === ownSlideTarget ? undefined : ownSlideTarget, reportIndex: undefined };
  }
  return { ownSlideTarget: undefined, reportIndex: selectedIndex === currentIndex ? undefined : selectedIndex };
}
