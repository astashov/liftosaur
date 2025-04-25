import { Exercise, IExercise } from "../../../models/exercise";
import { IPlannerProgramExercise, IPlannerProgramExerciseRepRange, ISetResults, ISetSplit } from "./types";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { IAllCustomExercises, IScreenMuscle, IUnit } from "../../../types";
import { PlannerProgramExercise } from "./plannerProgramExercise";
import { Weight } from "../../../models/weight";

type IResultsSetSplit = Omit<ISetResults, "total" | "strength" | "hypertrophy" | "muscleGroup" | "volume">;

export class PlannerStatsUtils {
  public static dayApproxTimeMs(exercises: IPlannerProgramExercise[], restTimer: number): number {
    return exercises
      .filter((e) => !e.notused)
      .reduce((acc, e) => {
        return (
          acc +
          PlannerProgramExercise.sets(e).reduce((acc2, set) => {
            const repRange = set.repRange;
            if (!repRange) {
              return acc2;
            }
            const reps = repRange.maxrep ?? 0;
            const secondsPerRep = 7;
            const prepareTime = 20;
            const timeToRep = (prepareTime + reps * secondsPerRep) * 1000;
            const timeToRest = (set.timer ?? restTimer ?? 0) * 1000;
            const totalTime = timeToRep + timeToRest;
            return acc2 + repRange.numberOfSets * totalTime;
          }, 0)
        );
      }, 0);
  }

  public static calculateSetResults(
    evaluatedDays: IPlannerEvalResult[],
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

    for (let dayIndex = 0; dayIndex < evaluatedDays.length; dayIndex += 1) {
      const day = evaluatedDays[dayIndex];
      if (!day.success) {
        continue;
      }
      for (const plannerExercise of day.data) {
        if (plannerExercise.notused) {
          continue;
        }
        const exercise = Exercise.findByName(plannerExercise.name, customExercises);
        if (exercise == null) {
          continue;
        }
        for (const set of PlannerProgramExercise.sets(plannerExercise)) {
          const repRange = set.repRange;
          if (repRange != null) {
            results.total += repRange.numberOfSets;
            if ((repRange.maxrep ?? 0) < 8) {
              results.strength += repRange.numberOfSets;
            } else {
              results.hypertrophy += repRange.numberOfSets;
            }
            if (exercise.types.indexOf("core") !== -1) {
              add(results, "core", repRange, dayIndex, exercise);
            }
            if (exercise.types.indexOf("push") !== -1) {
              add(results, "push", repRange, dayIndex, exercise);
            }
            if (exercise.types.indexOf("pull") !== -1) {
              add(results, "pull", repRange, dayIndex, exercise);
            }
            if (exercise.types.indexOf("legs") !== -1) {
              add(results, "legs", repRange, dayIndex, exercise);
            }
            if (exercise.types.indexOf("upper") !== -1) {
              add(results, "upper", repRange, dayIndex, exercise);
            }
            if (exercise.types.indexOf("lower") !== -1) {
              add(results, "lower", repRange, dayIndex, exercise);
            }
            const targetMuscleGroups = Exercise.targetMusclesGroups(exercise, customExercises);
            for (const muscle of targetMuscleGroups) {
              addMuscleGroup(results.muscleGroup, muscle, repRange, dayIndex, true, synergistMultiplier, exercise);
            }
            for (const muscle of Exercise.synergistMusclesGroups(exercise, customExercises)) {
              if (targetMuscleGroups.indexOf(muscle) === -1) {
                addMuscleGroup(results.muscleGroup, muscle, repRange, dayIndex, false, synergistMultiplier, exercise);
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
  dayIndex: number,
  exercise: IExercise
): void {
  let isStrength = false;
  if ((repRange.maxrep ?? 0) < 8) {
    isStrength = true;
    results[key].strength += repRange.numberOfSets;
  } else {
    results[key].hypertrophy += repRange.numberOfSets;
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
      ex.strengthSets += repRange.numberOfSets;
    } else {
      ex.hypertrophySets += repRange.numberOfSets;
    }
  }
}

function addMuscleGroup(
  results: { [k in IScreenMuscle]: ISetSplit },
  key: IScreenMuscle,
  repRange: IPlannerProgramExerciseRepRange,
  dayIndex: number,
  isTarget: boolean,
  synergistMultiplier: number,
  exercise: IExercise
): void {
  synergistMultiplier = synergistMultiplier ?? 0.5;
  let isStrength = false;
  if ((repRange.maxrep ?? 0) < 8) {
    isStrength = true;
    results[key].strength += isTarget ? repRange.numberOfSets : repRange.numberOfSets * synergistMultiplier;
  } else {
    results[key].hypertrophy += isTarget ? repRange.numberOfSets : repRange.numberOfSets * synergistMultiplier;
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
      ex.strengthSets += isTarget ? repRange.numberOfSets : repRange.numberOfSets * synergistMultiplier;
    } else {
      ex.hypertrophySets += isTarget ? repRange.numberOfSets : repRange.numberOfSets * synergistMultiplier;
    }
  }
}
