export type IWorkoutHintId = "workout-reorder" | "workout-target-switch" | "workout-set-expand";

const usesToLearn: Record<IWorkoutHintId, number> = {
  "workout-reorder": 2,
  "workout-target-switch": 1,
  "workout-set-expand": 2,
};

export function WorkoutHints_isLearned(helps: string[], id: IWorkoutHintId): boolean {
  return helps.indexOf(id) !== -1;
}

export function WorkoutHints_recordUse(helps: string[], id: IWorkoutHintId, stamp: string): string[] {
  const token = `${id}.${stamp}`;
  if (WorkoutHints_isLearned(helps, id) || helps.indexOf(token) !== -1) {
    return helps;
  }
  const uses = helps.filter((h) => h.startsWith(`${id}.`)).length + 1;
  const next = [...helps, token];
  return uses >= usesToLearn[id] ? [...next, id] : next;
}
