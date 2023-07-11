import { Exercise } from "../../../models/exercise";
import { IScreenMuscle } from "../../../models/muscle";
import { IPlannerProgramExerciseRepRange, ISetResults, ISetSplit } from "./types";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";

type IResultsSetSplit = Omit<ISetResults, "total" | "strength" | "hypertrophy" | "muscleGroup">;

export class PlannerStatsUtils {
  public static calculateSetResults(evaluatedDays: IPlannerEvalResult[]): ISetResults {
    const results: ISetResults = {
      total: 0,
      strength: 0,
      hypertrophy: 0,
      upper: { strength: 0, hypertrophy: 0, frequency: {} },
      lower: { strength: 0, hypertrophy: 0, frequency: {} },
      core: { strength: 0, hypertrophy: 0, frequency: {} },
      push: { strength: 0, hypertrophy: 0, frequency: {} },
      pull: { strength: 0, hypertrophy: 0, frequency: {} },
      legs: { strength: 0, hypertrophy: 0, frequency: {} },
      muscleGroup: {
        shoulders: { strength: 0, hypertrophy: 0, frequency: {} },
        triceps: { strength: 0, hypertrophy: 0, frequency: {} },
        back: { strength: 0, hypertrophy: 0, frequency: {} },
        abs: { strength: 0, hypertrophy: 0, frequency: {} },
        glutes: { strength: 0, hypertrophy: 0, frequency: {} },
        hamstrings: { strength: 0, hypertrophy: 0, frequency: {} },
        quadriceps: { strength: 0, hypertrophy: 0, frequency: {} },
        chest: { strength: 0, hypertrophy: 0, frequency: {} },
        biceps: { strength: 0, hypertrophy: 0, frequency: {} },
        calves: { strength: 0, hypertrophy: 0, frequency: {} },
        forearms: { strength: 0, hypertrophy: 0, frequency: {} },
      },
    };

    for (let dayIndex = 0; dayIndex < evaluatedDays.length; dayIndex += 1) {
      const day = evaluatedDays[dayIndex];
      if (!day.success) {
        continue;
      }
      for (const plannerExercise of day.data) {
        const exercise = Exercise.findByName(plannerExercise.name, {});
        if (exercise == null) {
          continue;
        }
        for (const set of plannerExercise.sets) {
          const repRange = set.repRange;
          if (repRange != null) {
            results.total += repRange.numberOfSets;
            if (repRange.maxrep < 8) {
              results.strength += repRange.numberOfSets;
            } else {
              results.hypertrophy += repRange.numberOfSets;
            }
            if (exercise.types.indexOf("core") !== -1) {
              add(results, "core", repRange, dayIndex);
            }
            if (exercise.types.indexOf("push") !== -1) {
              add(results, "push", repRange, dayIndex);
            }
            if (exercise.types.indexOf("pull") !== -1) {
              add(results, "pull", repRange, dayIndex);
            }
            if (exercise.types.indexOf("legs") !== -1) {
              add(results, "legs", repRange, dayIndex);
            }
            if (exercise.types.indexOf("upper") !== -1) {
              add(results, "upper", repRange, dayIndex);
            }
            if (exercise.types.indexOf("lower") !== -1) {
              add(results, "lower", repRange, dayIndex);
            }
            const targetMuscleGroups = Exercise.targetMusclesGroups(exercise, {});
            for (const muscle of targetMuscleGroups) {
              addMuscleGroup(results.muscleGroup, muscle, repRange, dayIndex, true);
            }
            for (const muscle of Exercise.synergistMusclesGroups(exercise, {})) {
              if (targetMuscleGroups.indexOf(muscle) === -1) {
                addMuscleGroup(results.muscleGroup, muscle, repRange, dayIndex, false);
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
  repRange: IPlannerProgramExerciseRepRange,
  dayIndex: number
): void {
  if (repRange.maxrep < 8) {
    results[key].strength += repRange.numberOfSets;
  } else {
    results[key].hypertrophy += repRange.numberOfSets;
  }
  results[key].frequency[dayIndex] = true;
}

function addMuscleGroup(
  results: { [k in IScreenMuscle]: ISetSplit },
  key: IScreenMuscle,
  repRange: IPlannerProgramExerciseRepRange,
  dayIndex: number,
  isTarget: boolean
): void {
  if (repRange.maxrep < 8) {
    results[key].strength += isTarget ? repRange.numberOfSets : repRange.numberOfSets / 2;
  } else {
    results[key].hypertrophy += isTarget ? repRange.numberOfSets : repRange.numberOfSets / 2;
  }
  results[key].frequency[dayIndex] = true;
}
