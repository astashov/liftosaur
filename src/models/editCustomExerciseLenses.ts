/* eslint-disable @typescript-eslint/ban-types */

import { ILensRecordingPayload, LensBuilder } from "lens-shmens";
import { ICustomExercise, IEquipment, IExerciseKind, IMuscle, ISettings } from "../types";
import { UidFactory } from "../utils/generator";
import { ObjectUtils } from "../utils/object";

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
      if (exercise != null) {
        const newExercise: ICustomExercise = {
          ...exercise,
          name,
          defaultEquipment: equipment,
          types,
          meta: { ...exercise.meta, targetMuscles, synergistMuscles },
        };
        return { ...exercises, [newExercise.id]: newExercise };
      } else {
        const deletedExerciseKey = ObjectUtils.keys(exercises).filter(
          (k) => exercises[k]?.isDeleted && exercises[k]?.name === name
        )[0];
        const deletedExercise = deletedExerciseKey != null ? exercises[deletedExerciseKey] : undefined;
        if (deletedExercise) {
          return {
            ...exercises,
            [deletedExercise.id]: {
              ...deletedExercise,
              name,
              defaultEquipment: equipment,
              targetMuscles,
              synergistMuscles,
              types,
              isDeleted: false,
            },
          };
        } else {
          const id = UidFactory.generateUid(8);
          const newExercise: ICustomExercise = {
            id,
            name,
            defaultEquipment: equipment,
            isDeleted: false,
            types,
            meta: {
              targetMuscles,
              synergistMuscles,
              bodyParts: [],
              sortedEquipment: [equipment],
            },
          };
          return { ...exercises, [id]: newExercise };
        }
      }
    });
  }

  export function markDeleted<T>(prefix: LensBuilder<T, ISettings, {}>, id: string): ILensRecordingPayload<T> {
    return prefix.p("exercises").recordModify((exercises) => {
      const exercise = exercises[id];
      return exercise != null ? { ...exercises, [id]: { ...exercise, isDeleted: true } } : exercises;
    });
  }
}
