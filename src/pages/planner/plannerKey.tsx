import memoize from "micro-memoize";
import { Exercise } from "../../models/exercise";
import { IAllCustomExercises, IExerciseType, ISettings } from "../../types";
import { IPlannerProgramExercise } from "./models/types";
import { PlannerExerciseEvaluator } from "./plannerExerciseEvaluator";

export class PlannerKey {
  public static fromPlannerExercise(plannerExercise: IPlannerProgramExercise, settings: ISettings): string {
    if (plannerExercise.exerciseType) {
      return this.fromExerciseType(plannerExercise.exerciseType, plannerExercise.label);
    } else {
      return this.fromFullName(plannerExercise.fullName, settings.exercises);
    }
  }

  public static fromExerciseType(exerciseType: IExerciseType, label?: string): string {
    const key = Exercise.toKey(exerciseType);
    const plannerKey = `${label ? `${label}-` : ""}${key}`.toLowerCase();
    return plannerKey;
  }

  public static fromFullName = memoize(
    (fullName: string, exercises: IAllCustomExercises): string => {
      const { label, name, equipment } = PlannerExerciseEvaluator.extractNameParts(fullName, exercises);
      return this.fromLabelNameAndEquipment(label, name, equipment, exercises);
    },
    { maxSize: 1000 }
  );

  public static fromLabelNameAndEquipment = memoize(
    (
      label: string | undefined,
      name: string,
      equipment: string | undefined,
      exercises: IAllCustomExercises
    ): string => {
      const exercise = Exercise.findByNameEquipment(exercises, name, equipment);
      const key = exercise ? Exercise.toKey(exercise) : name;
      const plannerKey = `${label ? `${label}-` : ""}${key}`.toLowerCase();
      return plannerKey;
    },
    {
      maxSize: 1000,
    }
  );
}
