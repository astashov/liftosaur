export interface IWorkoutStripLabelMeasure {
  titleWindowTop: number;
  titleHeight: number;
  viewportWindowTop: number;
  scrollY: number;
  stripHeight: number;
}

export interface IWorkoutStripLabelFadeRange {
  start: number;
  end: number;
}

export function WorkoutStripLabel_shadowRange(
  pagerContainerTop: number,
  stripHeight: number
): IWorkoutStripLabelFadeRange {
  const stuckAt = Math.max(0, pagerContainerTop - stripHeight);
  return { start: stuckAt, end: stuckAt + 8 };
}

export function WorkoutStripLabel_fadeRange(m: IWorkoutStripLabelMeasure): IWorkoutStripLabelFadeRange {
  const titleTop = m.titleWindowTop - m.viewportWindowTop + m.scrollY;
  const start = Math.max(0, titleTop - m.stripHeight);
  const end = Math.max(start + 1, titleTop + m.titleHeight - m.stripHeight);
  return { start, end };
}
