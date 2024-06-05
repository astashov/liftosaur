import { equipmentName, Exercise } from "../../models/exercise";
import { IProgramExercise, ISettings } from "../../types";
import { IPlannerProgramExercise } from "./models/types";
import { PlannerExerciseEvaluator } from "./plannerExerciseEvaluator";
import memoize from "micro-memoize";

export class PlannerKey {
  public static fromProgramExercise(programExercise: IProgramExercise, settings: ISettings): string {
    const exerciseTypeEquipment = programExercise.exerciseType.equipment;
    const exercise = Exercise.get(programExercise.exerciseType, settings.exercises);
    const equipment =
      exerciseTypeEquipment != null && exerciseTypeEquipment !== exercise.defaultEquipment
        ? exerciseTypeEquipment
        : undefined;
    const fullName = `${programExercise.name}${equipment ? `, ${equipmentName(equipment)}` : ""}`;
    // console.log("pe", fullName);
    return this.fromFullName(fullName, settings);
  }

  public static fromPlannerExercise(plannerExercise: IPlannerProgramExercise, settings: ISettings): string {
    return this.fromFullName(plannerExercise.fullName, settings);
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
