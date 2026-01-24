import { Exercise, IExercise } from "../../../models/exercise";
import { IPlannerProgramExercise, IPlannerProgramExerciseRepRange, ISetResults, ISetSplit } from "./types";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { IScreenMuscle, ISettings } from "../../../types";
import { PlannerProgramExercise } from "./plannerProgramExercise";
import { Weight } from "../../../models/weight";
import { Muscle } from "../../../models/muscle";

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

  public static calculateSetResults(evaluatedDays: IPlannerEvalResult[], settings: ISettings): ISetResults {
    const results: ISetResults = {
      volume: Weight.build(0, settings.units),
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

    for (const muscleGroup of Muscle.getAvailableMuscleGroups(settings)) {
      results.muscleGroup[muscleGroup] = results.muscleGroup[muscleGroup] || {
        strength: 0,
        hypertrophy: 0,
        frequency: {},
        exercises: [],
      };
    }

    for (let dayIndex = 0; dayIndex < evaluatedDays.length; dayIndex += 1) {
      const day = evaluatedDays[dayIndex];
      if (!day.success) {
        continue;
      }
      for (const plannerExercise of day.data) {
        if (plannerExercise.notused) {
          continue;
        }
        const exercise = Exercise.findByNameAndEquipment(plannerExercise.shortName, settings.exercises);
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
            const targetMuscleGroups = Exercise.targetMusclesGroups(exercise, settings);
            const synergistMusclesGroupMultipliers = Exercise.synergistMusclesGroupMultipliers(exercise, settings);
            for (const muscle of targetMuscleGroups) {
              const synergistMultiplier =
                synergistMusclesGroupMultipliers[muscle] ?? settings.planner.synergistMultiplier;
              addMuscleGroup(results.muscleGroup, muscle, repRange, dayIndex, true, synergistMultiplier, exercise);
            }
            for (const muscle of Exercise.synergistMusclesGroups(exercise, settings)) {
              if (targetMuscleGroups.indexOf(muscle) === -1) {
                const synergistMultiplier =
                  synergistMusclesGroupMultipliers[muscle] ?? settings.planner.synergistMultiplier;
                addMuscleGroup(results.muscleGroup, muscle, repRange, dayIndex, false, synergistMultiplier, exercise);
              }
            }
          }
        }
      }
    }
    return results;
  }

  public static setResultsToString(results: ISetResults): string {
    const lines: string[] = [];

    lines.push(`Total Weekly Volume: ${results.total} sets`);
    lines.push(`- Strength Sets (<8 reps): ${results.strength} sets`);
    lines.push(`- Hypertrophy Sets (≥8 reps): ${results.hypertrophy} sets`);
    lines.push("");

    lines.push("Movement Patterns:");
    if (results.upper.strength > 0 || results.upper.hypertrophy > 0) {
      lines.push(
        `- Upper Body: ${results.upper.strength + results.upper.hypertrophy} sets (${results.upper.strength} strength, ${results.upper.hypertrophy} hypertrophy)`
      );
    }
    if (results.lower.strength > 0 || results.lower.hypertrophy > 0) {
      lines.push(
        `- Lower Body: ${results.lower.strength + results.lower.hypertrophy} sets (${results.lower.strength} strength, ${results.lower.hypertrophy} hypertrophy)`
      );
    }
    if (results.push.strength > 0 || results.push.hypertrophy > 0) {
      lines.push(
        `- Push: ${results.push.strength + results.push.hypertrophy} sets (${results.push.strength} strength, ${results.push.hypertrophy} hypertrophy)`
      );
    }
    if (results.pull.strength > 0 || results.pull.hypertrophy > 0) {
      lines.push(
        `- Pull: ${results.pull.strength + results.pull.hypertrophy} sets (${results.pull.strength} strength, ${results.pull.hypertrophy} hypertrophy)`
      );
    }
    if (results.legs.strength > 0 || results.legs.hypertrophy > 0) {
      lines.push(
        `- Legs: ${results.legs.strength + results.legs.hypertrophy} sets (${results.legs.strength} strength, ${results.legs.hypertrophy} hypertrophy)`
      );
    }
    if (results.core.strength > 0 || results.core.hypertrophy > 0) {
      lines.push(
        `- Core: ${results.core.strength + results.core.hypertrophy} sets (${results.core.strength} strength, ${results.core.hypertrophy} hypertrophy)`
      );
    }
    lines.push("");

    lines.push("Muscle Groups (Weekly Sets):");
    const muscleGroups = Object.entries(results.muscleGroup)
      .filter(([_, stats]) => stats.strength > 0 || stats.hypertrophy > 0)
      .sort((a, b) => {
        const totalA = a[1].strength + a[1].hypertrophy;
        const totalB = b[1].strength + b[1].hypertrophy;
        return totalB - totalA;
      });

    for (const [muscle, stats] of muscleGroups) {
      const total = stats.strength + stats.hypertrophy;
      const capitalizedMuscle = muscle.charAt(0).toUpperCase() + muscle.slice(1);
      const frequencyDays = Object.keys(stats.frequency).length;

      lines.push(
        `- ${capitalizedMuscle}: ${total.toFixed(1)} sets (${stats.strength.toFixed(1)} strength, ${stats.hypertrophy.toFixed(1)} hypertrophy) - ${frequencyDays}x/week`
      );

      const exercises = stats.exercises
        .filter((ex) => ex.strengthSets > 0 || ex.hypertrophySets > 0)
        .sort((a, b) => {
          const totalA = a.strengthSets + a.hypertrophySets;
          const totalB = b.strengthSets + b.hypertrophySets;
          return totalB - totalA;
        });

      if (exercises.length > 0) {
        for (const ex of exercises) {
          const totalSets = ex.strengthSets + ex.hypertrophySets;
          const synergistNote = ex.isSynergist ? " (synergist)" : "";
          lines.push(`  • ${ex.exerciseName}: ${totalSets.toFixed(1)} sets${synergistNote}`);
        }
      }
    }

    return lines.join("\n");
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
  results[key] = results[key] || { strength: 0, hypertrophy: 0, frequency: {}, exercises: [] };
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
