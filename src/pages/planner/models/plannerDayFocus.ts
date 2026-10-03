import { IPlannerUiFocusedExercise } from "./types";

export function PlannerDayFocus_collapseKey(weekIndex: number, dayIndex: number): string {
  return `${weekIndex}-${dayIndex}`;
}

export function PlannerDayFocus_toggleCollapsed(collapsed: Set<string>, key: string): Set<string> {
  const next = new Set(collapsed);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  return next;
}

export function PlannerDayFocus_isNew(
  focused: IPlannerUiFocusedExercise | undefined,
  next: IPlannerUiFocusedExercise
): boolean {
  return (
    focused?.weekIndex !== next.weekIndex ||
    focused.dayIndex !== next.dayIndex ||
    focused.exerciseLine !== next.exerciseLine
  );
}
