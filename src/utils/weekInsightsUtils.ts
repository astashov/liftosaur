import { Exercise, IExercise } from "../models/exercise";
import { Weight } from "../models/weight";
import { ISetResults, ISetSplit } from "../pages/planner/models/types";
import { IAllCustomExercises, IHistoryRecord, IScreenMuscle, IUnit } from "../types";

type IResultsSetSplit = Omit<ISetResults, "total" | "strength" | "hypertrophy" | "muscleGroup" | "volume">;

export class WeekInsightsUtils {
  public static calculateSetResults(
    historyRecords: IHistoryRecord[],
    customExercises: IAllCustomExercises,
    synergistMultiplier: number,
    unit: IUnit
  ): ISetResults {
    const results: ISetResults = {
      volume: Weight.build(0, unit),
      total: 0,
      strength: 0,
      hypertrophy: 0,
      upper: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
      lower: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
      core: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
      push: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
      pull: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
      legs: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
      muscleGroup: {
        shoulders: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
        triceps: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
        back: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
        abs: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
        glutes: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
        hamstrings: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
        quadriceps: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
        chest: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
        biceps: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
        calves: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
        forearms: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
      },
    };

    for (const record of historyRecords) {
      const dayIndex = new Date(record.startTime).getDay();
      for (const entry of record.entries) {
        const exercise = Exercise.get(entry.exercise, customExercises);
        if (exercise == null) {
          continue;
        }
        for (const set of entry.sets) {
          const completedReps = set.completedReps || 0;
          if (completedReps > 0) {
            results.volume = Weight.add(
              results.volume,
              Weight.multiply(set.completedWeight ?? set.weight ?? Weight.build(0, unit), set.completedReps || 0)
            );
            results.total += 1;
            if (completedReps < 8) {
              results.strength += 1;
            } else {
              results.hypertrophy += 1;
            }
            if (exercise.types.indexOf("core") !== -1) {
              add(results, "core", completedReps, dayIndex, exercise);
            }
            if (exercise.types.indexOf("push") !== -1) {
              add(results, "push", completedReps, dayIndex, exercise);
            }
            if (exercise.types.indexOf("pull") !== -1) {
              add(results, "pull", completedReps, dayIndex, exercise);
            }
            if (exercise.types.indexOf("legs") !== -1) {
              add(results, "legs", completedReps, dayIndex, exercise);
            }
            if (exercise.types.indexOf("upper") !== -1) {
              add(results, "upper", completedReps, dayIndex, exercise);
            }
            if (exercise.types.indexOf("lower") !== -1) {
              add(results, "lower", completedReps, dayIndex, exercise);
            }
            const targetMuscleGroups = Exercise.targetMusclesGroups(exercise, customExercises);
            for (const muscle of targetMuscleGroups) {
              addMuscleGroup(results.muscleGroup, muscle, completedReps, dayIndex, true, synergistMultiplier, exercise);
            }
            for (const muscle of Exercise.synergistMusclesGroups(exercise, customExercises)) {
              if (targetMuscleGroups.indexOf(muscle) === -1) {
                addMuscleGroup(
                  results.muscleGroup,
                  muscle,
                  completedReps,
                  dayIndex,
                  false,
                  synergistMultiplier,
                  exercise
                );
              }
            }
          }
        }
      }
    }
    return results;
  }
}

function add(
  results: IResultsSetSplit,
  key: keyof IResultsSetSplit,
  completedReps: number,
  dayIndex: number,
  exercise: IExercise
): void {
  let isStrength = false;
  if (completedReps < 8) {
    isStrength = true;
    results[key].strength += 1;
  } else {
    results[key].hypertrophy += 1;
  }
  results[key].frequency[dayIndex] = true;
  if (results[key].exercises.every((e) => e.exerciseName !== exercise.name)) {
    results[key].exercises.push({
      exerciseName: exercise.name,
      dayIndex: dayIndex,
      isSynergist: false,
      strengthSets: 0,
      hypertrophySets: 0,
    });
  }
  const ex = results[key].exercises.find((e) => e.exerciseName === exercise.name);
  if (ex) {
    if (isStrength) {
      ex.strengthSets += 1;
    } else {
      ex.hypertrophySets += 1;
    }
  }
}

function addMuscleGroup(
  results: { [k in IScreenMuscle]: ISetSplit },
  key: IScreenMuscle,
  completedReps: number,
  dayIndex: number,
  isTarget: boolean,
  synergistMultiplier: number,
  exercise: IExercise
): void {
  synergistMultiplier = synergistMultiplier ?? 0.5;
  let isStrength = false;
  if (completedReps < 8) {
    isStrength = true;
    results[key].strength += isTarget ? 1 : 1 * synergistMultiplier;
  } else {
    results[key].hypertrophy += isTarget ? 1 : 1 * synergistMultiplier;
  }
  results[key].frequency[dayIndex] = true;
  if (results[key].exercises.every((e) => e.exerciseName !== exercise.name)) {
    results[key].exercises.push({
      exerciseName: exercise.name,
      dayIndex: dayIndex,
      isSynergist: !isTarget,
      strengthSets: 0,
      hypertrophySets: 0,
    });
  }
  const ex = results[key].exercises.find((e) => e.exerciseName === exercise.name);
  if (ex) {
    if (isStrength) {
      ex.strengthSets += isTarget ? 1 : 1 * synergistMultiplier;
    } else {
      ex.hypertrophySets += isTarget ? 1 : 1 * synergistMultiplier;
    }
  }
}
