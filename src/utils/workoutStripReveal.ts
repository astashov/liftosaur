export interface IWorkoutStripRevealMeasure {
  index: number;
  count: number;
  pitch: number;
  gap: number;
  padding: number;
  offset: number;
  viewportWidth: number;
  contentWidth: number;
}

export function WorkoutStripReveal_offset(m: IWorkoutStripRevealMeasure): number | undefined {
  if (m.viewportWidth <= 0) {
    return undefined;
  }
  const left = m.padding + m.index * m.pitch;
  const right = left + m.pitch - m.gap;
  const maxOffset = Math.max(0, m.contentWidth - m.viewportWidth);
  let target: number;
  if (m.index === m.count - 1) {
    return Math.abs(maxOffset - m.offset) >= 1 ? maxOffset : undefined;
  } else if (left < m.offset) {
    target = left - m.padding;
  } else if (right > m.offset + m.viewportWidth) {
    target = right + m.padding - m.viewportWidth;
  } else {
    return undefined;
  }
  return Math.min(maxOffset, Math.max(0, target));
}
