import { Exercise } from "../../models/exercise";
import { IExerciseType, ISettings } from "../../types";
import { IPlannerProgramExercise } from "./models/types";
import { PlannerExerciseEvaluator } from "./plannerExerciseEvaluator";

export class PlannerKey {
  public static fromPlannerExercise(plannerExercise: IPlannerProgramExercise, settings: ISettings): string {
    if (plannerExercise.exerciseType) {
      return this.fromExerciseType(plannerExercise.exerciseType, settings, plannerExercise.label);
    } else {
      return this.fromFullName(plannerExercise.fullName, settings);
    }
  }

  public static fromExerciseType(exerciseType: IExerciseType, settings: ISettings, label?: string): string {
    const key = Exercise.toKey(exerciseType);
    const plannerKey = `${label ? `${label}-` : ""}${key}`.toLowerCase();
    return plannerKey;
  }

  public static fromFullName(fullName: string, settings: ISettings): string {
    const { label, name, equipment } = PlannerExerciseEvaluator.extractNameParts(fullName, settings);
    const exercise = Exercise.findByNameEquipment(settings.exercises, name, equipment);
    const key = exercise ? Exercise.toKey(exercise) : name;
    const plannerKey = `${label ? `${label}-` : ""}${key}`.toLowerCase();
    return plannerKey;
  }
}
