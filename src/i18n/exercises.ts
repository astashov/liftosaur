import names from "./exercises.fr.json";
import type { IExercise } from "../models/exercise";
import type { IAllCustomExercises } from "../types";
import type { ILanguage } from "./index";

// Display only: canonical English names and exercise IDs remain unchanged in Liftoscript and backups.
export function I18n_exerciseName(
  exercise: Pick<IExercise, "id" | "name">,
  customExercises: IAllCustomExercises,
  language: ILanguage
): string {
  if (language !== "fr" || customExercises[exercise.id] != null) {
    return exercise.name;
  }
  return Object.prototype.hasOwnProperty.call(names, exercise.name)
    ? names[exercise.name as keyof typeof names]
    : exercise.name;
}
