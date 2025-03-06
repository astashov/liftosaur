import { Exercise } from "../../models/exercise";
import { IExerciseType, ISettings } from "../../types";
import { IPlannerProgramExercise } from "./models/types";
import { PlannerExerciseEvaluator } from "./plannerExerciseEvaluator";
import memoize from "micro-memoize";

export class PlannerKey {
  public static fromPlannerExercise(plannerExercise: IPlannerProgramExercise, settings: ISettings): string {
    if (plannerExercise.exerciseType) {
      return this.fromExerciseType(plannerExercise.exerciseType, settings, plannerExercise.label);
    } else {
      return this.fromFullName(plannerExercise.fullName, settings);
    }
  }

  public static fromExerciseType(exerciseType: IExerciseType, settings: ISettings, label?: string): string {
    const exercise = Exercise.get(exerciseType, settings.exercises);
    const eq =
      exercise.equipment != null && exercise.equipment !== exercise.defaultEquipment ? exercise.equipment : undefined;
    return `${label ? `${label}-` : ""}${exercise.name}${eq ? `-${eq}` : ""}`.toLowerCase();
  }

  public static fromFullName = memoize(
    (fullName: string, settings: ISettings): string => {
      const { label, name, equipment } = PlannerExerciseEvaluator.extractNameParts(fullName, settings);
      const exercise = Exercise.findByName(name, settings.exercises);
      const eq = equipment != null && equipment !== exercise?.defaultEquipment ? equipment : undefined;
      return `${label ? `${label}-` : ""}${name}${eq ? `-${eq}` : ""}`.toLowerCase();
    },
    { maxSize: 500 }
  );
}
