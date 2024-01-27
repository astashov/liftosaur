import { IPlannerProgramExercise } from "./types";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";

export class PlannerProgramExercise {
  public static numberOfSets(exercise: IPlannerProgramExercise): number {
    return exercise.setVariations[this.currentSetVariation(exercise)].sets.reduce(
      (acc, set) => acc + (set.repRange?.numberOfSets || 0),
      0
    );
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
