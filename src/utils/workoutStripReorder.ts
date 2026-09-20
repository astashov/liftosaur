export function WorkoutStripReorder_dropIndex(
  fromIndex: number,
  translation: number,
  tileWidth: number,
  count: number
): number {
  if (count === 0 || tileWidth <= 0) {
    return fromIndex;
  }
  const moved = Math.round(translation / tileWidth);
  return Math.max(0, Math.min(count - 1, fromIndex + moved));
}

export function WorkoutStripReorder_slots(ids: string[], fromIndex?: number, toIndex?: number): Record<string, number> {
  const ordered = [...ids];
  if (fromIndex != null && toIndex != null && fromIndex !== toIndex && ordered[fromIndex] != null) {
    const [moved] = ordered.splice(fromIndex, 1);
    ordered.splice(toIndex, 0, moved);
  }
  const slots: Record<string, number> = {};
  ordered.forEach((id, slot) => {
    slots[id] = slot;
  });
  return slots;
}

export interface IWorkoutStripReorderResult<T> {
  entries: T[];
  currentEntryIndex: number;
}

export function WorkoutStripReorder_apply<T extends { index: number }>(
  entries: T[],
  currentEntryIndex: number,
  fromIndex: number,
  toIndex: number
): IWorkoutStripReorderResult<T> | undefined {
  if (
    fromIndex < 0 ||
    fromIndex >= entries.length ||
    toIndex < 0 ||
    toIndex >= entries.length ||
    fromIndex === toIndex
  ) {
    return undefined;
  }
  const moved = [...entries];
  const [entry] = moved.splice(fromIndex, 1);
  moved.splice(toIndex, 0, entry);
  return {
    entries: moved.map((e, i) => ({ ...e, index: i })),
    currentEntryIndex: WorkoutStripReorder_currentAfterMove(currentEntryIndex, fromIndex, toIndex),
  };
}

export function WorkoutStripReorder_currentAfterMove(currentIndex: number, fromIndex: number, toIndex: number): number {
  if (currentIndex === fromIndex) {
    return toIndex;
  }
  if (fromIndex < currentIndex && currentIndex <= toIndex) {
    return currentIndex - 1;
  }
  if (toIndex <= currentIndex && currentIndex < fromIndex) {
    return currentIndex + 1;
  }
  return currentIndex;
}

export function WorkoutStripReorder_shift(
  index: number,
  fromIndex: number,
  dropIndex: number,
  tileWidth: number
): number {
  "worklet";
  if (fromIndex < 0 || index === fromIndex) {
    return 0;
  }
  if (fromIndex < dropIndex && index > fromIndex && index <= dropIndex) {
    return -tileWidth;
  }
  if (fromIndex > dropIndex && index >= dropIndex && index < fromIndex) {
    return tileWidth;
  }
  return 0;
}
