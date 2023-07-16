import { lb } from "lens-shmens";
import { IDispatch } from "../ducks/types";
import { updateState, IState } from "./state";
import { IEquipment, ICustomExercise, IMuscle, IExerciseKind } from "../types";
import { EditCustomExerciseLenses } from "./editCustomExerciseLenses";

export namespace EditCustomExercise {
  export function createOrUpdate(
    dispatch: IDispatch,
    name: string,
    equipment: IEquipment,
    targetMuscles: IMuscle[],
    synergistMuscles: IMuscle[],
    types: IExerciseKind[],
    exercise?: ICustomExercise
  ): void {
    updateState(dispatch, [
      EditCustomExerciseLenses.createOrUpdate(
        lb<IState>().p("storage").p("settings"),
        name,
        equipment,
        targetMuscles,
        synergistMuscles,
        types,
        exercise
      ),
    ]);
  }

  export function markDeleted(dispatch: IDispatch, id: string): void {
    updateState(dispatch, [EditCustomExerciseLenses.markDeleted(lb<IState>().p("storage").p("settings"), id)]);
  }
}
