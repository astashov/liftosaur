export interface IWorkoutTimeEstimateSet {
  reps?: number;
  timer?: number;
  setTimer?: number;
  auto?: boolean;
}

export interface IWorkoutTimeEstimateExercise {
  superset?: string;
  isUnilateral?: boolean;
  sets: IWorkoutTimeEstimateSet[];
}

export interface IWorkoutTimeEstimateTimers {
  rest: number;
  superset?: number;
}

const secondsPerRep = 7;
const prepareSeconds = 20;

function setWorkMs(set: IWorkoutTimeEstimateSet, isUnilateral: boolean | undefined): number {
  const prepare = set.auto ? 0 : prepareSeconds;
  const sideWork = set.setTimer != null ? set.setTimer : (set.reps ?? 0) * secondsPerRep;
  const sides = isUnilateral ? 2 : 1;
  return (prepare + sideWork * sides) * 1000;
}

export function WorkoutTimeEstimate_dayMs(
  exercises: IWorkoutTimeEstimateExercise[],
  timers: IWorkoutTimeEstimateTimers
): number {
  let totalMs = 0;
  const visitedSupersets = new Set<string>();
  for (const exercise of exercises) {
    if (exercise.superset == null) {
      totalMs += straightSetsMs(exercise, timers.rest);
    } else if (!visitedSupersets.has(exercise.superset)) {
      visitedSupersets.add(exercise.superset);
      const group = exercises.filter((e) => e.superset === exercise.superset);
      totalMs +=
        group.length > 1 ? supersetMs(group, timers) : straightSetsMs(exercise, timers.superset ?? timers.rest);
    }
  }
  return totalMs;
}

function straightSetsMs(exercise: IWorkoutTimeEstimateExercise, restTimer: number): number {
  return exercise.sets.reduce(
    (acc, set) => acc + setWorkMs(set, exercise.isUnilateral) + (set.timer ?? restTimer) * 1000,
    0
  );
}

function supersetMs(group: IWorkoutTimeEstimateExercise[], timers: IWorkoutTimeEstimateTimers): number {
  const rounds = Math.max(...group.map((e) => e.sets.length));
  let totalMs = 0;
  for (let round = 0; round < rounds; round += 1) {
    const roundMembers = group.filter((e) => e.sets[round] != null);
    roundMembers.forEach((exercise, index) => {
      const set = exercise.sets[round];
      const isLastInRound = index === roundMembers.length - 1;
      const rest = isLastInRound ? (set.timer ?? timers.superset ?? timers.rest) : (timers.superset ?? 0);
      totalMs += setWorkMs(set, exercise.isUnilateral) + rest * 1000;
    });
  }
  return totalMs;
}
