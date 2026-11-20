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
  return exercises.reduce((acc, exercise) => acc + exerciseMs(exercise, defaultRest(exercise, timers)), 0);
}

// Mirrors the rest Progress_startTimer starts after each set, so the estimate matches the workout.
function defaultRest(exercise: IWorkoutTimeEstimateExercise, timers: IWorkoutTimeEstimateTimers): number {
  return exercise.superset != null ? (timers.superset ?? timers.rest) : timers.rest;
}

function exerciseMs(exercise: IWorkoutTimeEstimateExercise, restTimer: number): number {
  return exercise.sets.reduce(
    (acc, set) => acc + setWorkMs(set, exercise.isUnilateral) + (set.timer ?? restTimer) * 1000,
    0
  );
}
