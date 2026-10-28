import { Exercise_resolveNameAndEquipment } from "./models/exercise";
import { PlannerKey_fromFullName } from "./pages/planner/plannerKey";
import { IAllCustomExercises, IExerciseType } from "./types";

export function LiftoscriptExerciseName_isProgramExercise(
  pattern: string,
  programExerciseKey: string,
  customExercises: IAllCustomExercises
): boolean {
  return PlannerKey_fromFullName(pattern, customExercises) === programExerciseKey;
}

export function LiftoscriptExerciseName_isExercise(
  pattern: string,
  exerciseType: IExerciseType,
  customExercises: IAllCustomExercises
): boolean {
  const colonIndex = pattern.indexOf(":");
  const nameAndEquipment = (colonIndex === -1 ? pattern : pattern.slice(colonIndex + 1)).trim();
  const resolved = Exercise_resolveNameAndEquipment(nameAndEquipment, customExercises);
  if (resolved == null || resolved.exercise.id !== exerciseType.id) {
    return false;
  }
  return !resolved.hasExplicitEquipment || resolved.exercise.equipment === exerciseType.equipment;
}
