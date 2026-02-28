import memoize from "micro-memoize";
import { Exercise_toKey, Exercise_findByNameEquipment } from "../../models/exercise";
import { IAllCustomExercises, IExerciseType, ISettings } from "../../types";
import { IPlannerProgramExercise } from "./models/types";
import { PlannerExerciseEvaluator } from "./plannerExerciseEvaluator";

export function PlannerKey_fromPlannerExercise(plannerExercise: IPlannerProgramExercise, settings: ISettings): string {
  if (plannerExercise.exerciseType) {
    return PlannerKey_fromExerciseType(plannerExercise.exerciseType, plannerExercise.label);
  } else {
    return PlannerKey_fromFullName(plannerExercise.fullName, settings.exercises);
  }
}

export function PlannerKey_fromExerciseType(exerciseType: IExerciseType, label?: string): string {
  const key = Exercise_toKey(exerciseType);
  const plannerKey = `${label ? `${label}-` : ""}${key}`.toLowerCase();
  return plannerKey;
}

export const PlannerKey_fromFullName = memoize(
  (fullName: string, exercises: IAllCustomExercises): string => {
    const { label, name, equipment } = PlannerExerciseEvaluator.extractNameParts(fullName, exercises);
    return PlannerKey_fromLabelNameAndEquipment(label, name, equipment, exercises);
  },
  { maxSize: 1000 }
);

export const PlannerKey_fromLabelNameAndEquipment = memoize(
  (label: string | undefined, name: string, equipment: string | undefined, exercises: IAllCustomExercises): string => {
    const exercise = Exercise_findByNameEquipment(exercises, name, equipment);
    const key = exercise ? Exercise_toKey(exercise) : name;
    const plannerKey = `${label ? `${label}-` : ""}${key}`.toLowerCase();
    return plannerKey;
  },
  {
    maxSize: 1000,
  }
);
