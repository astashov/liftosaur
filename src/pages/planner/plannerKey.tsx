import memoize from "micro-memoize";
import { Exercise_toKey, Exercise_findByNameEquipment } from "../../models/exercise";
import { IAllCustomExercises, IExerciseType, ISettings } from "../../types";
import { IPlannerProgramExercise, IPlannerProgramExerciseVariation } from "./models/types";
import { PlannerExerciseEvaluator } from "./plannerExerciseEvaluator";

export function PlannerKey_fromPlannerExercise(plannerExercise: IPlannerProgramExercise, settings: ISettings): string {
  if (plannerExercise.exerciseVariations != null && plannerExercise.exerciseVariations.length > 1) {
    return PlannerKey_fromExerciseVariations(plannerExercise.exerciseVariations, plannerExercise.label);
  } else if (plannerExercise.exerciseType) {
    return PlannerKey_fromExerciseType(plannerExercise.exerciseType, plannerExercise.label);
  } else {
    return PlannerKey_fromFullName(plannerExercise.fullName, settings.exercises);
  }
}

export function PlannerKey_fromExerciseVariations(
  variations: IPlannerProgramExerciseVariation[],
  label: string | undefined
): string {
  const keyPart = variations.map((v) => (v.exerciseType ? Exercise_toKey(v.exerciseType) : v.name)).join("_");
  return `${label ? `${label}-` : ""}${keyPart}`.toLowerCase();
}

export function PlannerKey_fromExerciseType(exerciseType: IExerciseType, label?: string): string {
  const key = Exercise_toKey(exerciseType);
  const plannerKey = `${label ? `${label}-` : ""}${key}`.toLowerCase();
  return plannerKey;
}

export const PlannerKey_fromFullName = memoize(
  (fullName: string, exercises: IAllCustomExercises): string => {
    const segments = fullName.split("|");
    if (segments.length === 1) {
      const { label, name, equipment } = PlannerExerciseEvaluator.extractNameParts(fullName, exercises);
      return PlannerKey_fromLabelNameAndEquipment(label, name, equipment, exercises);
    }
    let label: string | undefined;
    const keyParts = segments.map((segment, i) => {
      const cleaned = segment.trim().replace(/^!\s*/, "");
      const { label: segmentLabel, name, equipment } = PlannerExerciseEvaluator.extractNameParts(cleaned, exercises);
      if (i === 0) {
        label = segmentLabel;
      }
      const exercise = Exercise_findByNameEquipment(exercises, name, equipment);
      return exercise ? Exercise_toKey(exercise) : name;
    });
    return `${label ? `${label}-` : ""}${keyParts.join("_")}`.toLowerCase();
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
