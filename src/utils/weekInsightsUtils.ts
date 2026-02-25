import {
  IExercise,
  Exercise_get,
  Exercise_targetMusclesGroups,
  Exercise_synergistMusclesGroupMultipliers,
  Exercise_synergistMusclesGroups,
} from "../models/exercise";
import { Reps_setVolume } from "../models/set";
import { Weight_build, Weight_add } from "../models/weight";
import { ISetResults, ISetSplit } from "../pages/planner/models/types";
import { IHistoryRecord, IScreenMuscle, ISettings } from "../types";

type IResultsSetSplit = Omit<ISetResults, "total" | "strength" | "hypertrophy" | "muscleGroup" | "volume">;

export class WeekInsightsUtils {
  public static calculateSetResults(historyRecords: IHistoryRecord[], settings: ISettings): ISetResults {
    const results: ISetResults = {
      volume: Weight_build(0, settings.units),
      total: 0,
      strength: 0,
      hypertrophy: 0,
      upper: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
      lower: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
      core: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
      push: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
      pull: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
      legs: { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] },
      muscleGroup: {},
    };

    for (const record of historyRecords) {
      const dayIndex = new Date(record.startTime).getDay();
      for (const entry of record.entries) {
        const exercise = Exercise_get(entry.exercise, settings.exercises);
        if (exercise == null) {
          continue;
        }
        for (const set of entry.sets) {
          const completedReps = set.completedReps || 0;
          if (completedReps > 0) {
            results.volume = Weight_add(results.volume, Reps_setVolume(set, settings.units));
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
            const targetMuscleGroups = Exercise_targetMusclesGroups(exercise, settings);
            const synergistMusclesGroupMultipliers = Exercise_synergistMusclesGroupMultipliers(exercise, settings);
            for (const muscle of targetMuscleGroups) {
              const synergistMultiplier =
                synergistMusclesGroupMultipliers[muscle] ?? settings.planner.synergistMultiplier;
              addMuscleGroup(results.muscleGroup, muscle, completedReps, dayIndex, true, synergistMultiplier, exercise);
            }
            for (const muscle of Exercise_synergistMusclesGroups(exercise, settings)) {
              if (targetMuscleGroups.indexOf(muscle) === -1) {
                const synergistMultiplier =
                  synergistMusclesGroupMultipliers[muscle] ?? settings.planner.synergistMultiplier;
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
  results[key] = results[key] || { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] };
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
