import { ILensRecordingPayload, LensBuilder } from "lens-shmens";
import { ICustomExercise, IExerciseKind, IMuscle, ISettings } from "../types";
import { Exercise } from "./exercise";

export namespace EditCustomExerciseLenses {
  export function createOrUpdate<T>(
    prefix: LensBuilder<T, ISettings, {}>,
    name: string,
    targetMuscles: IMuscle[],
    synergistMuscles: IMuscle[],
    types: IExerciseKind[],
    smallImageUrl?: string,
    largeImageUrl?: string,
    exercise?: ICustomExercise
  ): ILensRecordingPayload<T> {
    return prefix.p("exercises").recordModify((exercises) => {
      return Exercise.createOrUpdateCustomExercise(
        exercises,
        name,
        targetMuscles,
        synergistMuscles,
        types,
        smallImageUrl,
        largeImageUrl,
        exercise
      );
    });
  }

  export function markDeleted<T>(prefix: LensBuilder<T, ISettings, {}>, id: string): ILensRecordingPayload<T> {
    return prefix.p("exercises").recordModify((exercises) => {
      const exercise = exercises[id];
      return exercise != null ? { ...exercises, [id]: { ...exercise, isDeleted: true } } : exercises;
    });
  }
}
