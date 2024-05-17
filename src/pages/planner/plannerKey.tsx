import { equipmentName, Exercise } from "../../models/exercise";
import { IProgramExercise, ISettings } from "../../types";
import { IPlannerProgramExercise } from "./models/types";
import { PlannerExerciseEvaluator } from "./plannerExerciseEvaluator";
import memoize from "micro-memoize";

export class PlannerKey {
  public static fromProgramExercise(programExercise: IProgramExercise, settings: ISettings): string {
    return this.fromFullName(
      `${programExercise.name},${equipmentName(programExercise.exerciseType.equipment, settings.equipment)}`,
      settings
    );
  }

  public static fromPlannerExercise(plannerExercise: IPlannerProgramExercise, settings: ISettings): string {
    return this.fromFullName(plannerExercise.fullName, settings);
  }

  public static fromFullName = memoize(
    (fullName: string, settings: ISettings): string => {
      const { label, name, equipment } = PlannerExerciseEvaluator.extractNameParts(fullName, settings);
      const exercise = Exercise.findByName(name, settings.exercises);
      return `${label ? `${label}-` : ""}${name}-${
        equipment || exercise?.defaultEquipment || "bodyweight"
      }`.toLowerCase();
    },
    { maxSize: 500 }
  );
}
