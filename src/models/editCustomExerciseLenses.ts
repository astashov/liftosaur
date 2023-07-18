/* eslint-disable @typescript-eslint/ban-types */

import { ILensRecordingPayload, LensBuilder } from "lens-shmens";
import { ICustomExercise, IEquipment, IExerciseKind, IMuscle, ISettings } from "../types";
import { Exercise } from "./exercise";

export namespace EditCustomExerciseLenses {
  export function createOrUpdate<T>(
    prefix: LensBuilder<T, ISettings, {}>,
    name: string,
    equipment: IEquipment,
    targetMuscles: IMuscle[],
    synergistMuscles: IMuscle[],
    types: IExerciseKind[],
    exercise?: ICustomExercise
  ): ILensRecordingPayload<T> {
    return prefix.p("exercises").recordModify((exercises) => {
      return Exercise.createOrUpdateCustomExercise(
        exercises,
        name,
        equipment,
        targetMuscles,
        synergistMuscles,
        types,
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
