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
