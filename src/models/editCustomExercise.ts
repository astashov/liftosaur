import { lb } from "lens-shmens";
import { IDispatch } from "../ducks/types";
import { updateState, IState } from "./state";
import { IEquipment, ICustomExercise, IMuscle } from "../types";
import { ObjectUtils } from "../utils/object";
import { UidFactory } from "../utils/generator";

export namespace EditCustomExercise {
  export function createOrUpdate(
    dispatch: IDispatch,
    name: string,
    equipment: IEquipment,
    targetMuscles: IMuscle[],
    synergistMuscles: IMuscle[],
    exercise?: ICustomExercise
  ): void {
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("settings")
        .p("exercises")
        .recordModify((exercises) => {
          if (exercise != null) {
            const newExercise: ICustomExercise = {
              ...exercise,
              name,
              defaultEquipment: equipment,
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
                meta: {
                  targetMuscles,
                  synergistMuscles,
                  bodyParts: [],
                },
              };
              return { ...exercises, [id]: newExercise };
            }
          }
        }),
    ]);
  }

  export function markDeleted(dispatch: IDispatch, id: string): void {
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("settings")
        .p("exercises")
        .recordModify((exercises) => {
          const exercise = exercises[id];
          return exercise != null ? { ...exercises, [id]: { ...exercise, isDeleted: true } } : exercises;
        }),
    ]);
  }
}
