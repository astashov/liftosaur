import {
  IPlannerProgramExercise,
  IPlannerProgramExerciseSet,
  IPlannerProgramExerciseSetVariation,
  IPlannerProgramExerciseWarmupSet,
} from "./types";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { ObjectUtils } from "../../../utils/object";

export class PlannerProgramExercise {
  public static numberOfSets(exercise: IPlannerProgramExercise): number {
    return PlannerProgramExercise.sets(exercise).reduce((acc, set) => acc + (set.repRange?.numberOfSets || 0), 0);
  }

  public static setVariations(exercise: IPlannerProgramExercise): IPlannerProgramExerciseSetVariation[] {
    const setVariations = exercise.setVariations;
    return setVariations.length === 0
      ? [{ sets: PlannerProgramExercise.sets(exercise), isCurrent: true }]
      : setVariations;
  }

  public static warmups(exercise: IPlannerProgramExercise): IPlannerProgramExerciseWarmupSet[] | undefined {
    return exercise.warmupSets || exercise.reuse?.exercise?.warmupSets;
  }

  public static sets(exercise: IPlannerProgramExercise, variationIndex?: number): IPlannerProgramExerciseSet[] {
    const reusedSets = exercise.reuse?.exercise?.sets;
    const reusedGlobals = exercise.reuse?.exercise?.globals || {};
    variationIndex = variationIndex ?? this.currentSetVariation(exercise);
    const currentSets = exercise.setVariations[variationIndex]?.sets;
    const currentGlobals = exercise.globals;
    const sets = currentSets || reusedSets || [];
    return sets.map((aSet) => {
      const set: IPlannerProgramExerciseSet = ObjectUtils.clone(aSet);
      set.rpe = currentGlobals.rpe != null ? currentGlobals.rpe : set.rpe ?? reusedGlobals.rpe;
      set.timer = currentGlobals.timer != null ? currentGlobals.timer : set.timer ?? reusedGlobals.timer;
      if (currentGlobals.weight != null || currentGlobals.percentage != null) {
        if (currentGlobals.weight != null) {
          set.weight = currentGlobals.weight;
        } else {
          set.percentage = currentGlobals.percentage;
        }
      } else {
        set.weight = set.weight ?? reusedGlobals.weight;
        set.percentage = set.percentage ?? reusedGlobals.percentage;
      }

      set.logRpe = !!(currentGlobals.rpe != null && currentGlobals.logRpe != null
        ? currentGlobals.logRpe
        : set.logRpe ?? reusedGlobals.logRpe);
      set.askWeight = !!((currentGlobals.weight != null || currentGlobals.percentage != null) &&
      currentGlobals.askWeight != null
        ? currentGlobals.askWeight
        : set.askWeight ?? reusedGlobals.askWeight);
      return set;
    });
  }

  public static currentSetVariation(exercise: IPlannerProgramExercise): number {
    const index = exercise.setVariations.findIndex((sv) => sv.isCurrent);
    return index === -1 ? 0 : index;
  }

  public static numberOfSetsThisWeek(exerciseName: string, week: IPlannerEvalResult[]): number {
    return week.reduce((acc, days) => {
      if (days.success) {
        const numberOfSetsThisDay = days.data
          .filter((e) => e.name === exerciseName)
          .reduce((acc2, e) => acc2 + PlannerProgramExercise.numberOfSets(e), 0);
        return acc + numberOfSetsThisDay;
      } else {
        return acc;
      }
    }, 0);
  }
}
