import { LensBuilder, lf } from "../utils/lens";
import { IState, updateState } from "../ducks/reducer";
import { IProgramDayEntry, IProgramDay } from "./program";
import { IDispatch } from "../ducks/types";
import { IProgramSet } from "./set";
import { IExcerciseType } from "./excercise";

export namespace EditProgram {
  export function removeEntry(
    dispatch: IDispatch,
    editDayLensBuilder: LensBuilder<IState, IProgramDay>,
    entry: IProgramDayEntry
  ): void {
    updateState(dispatch, [
      editDayLensBuilder.p("excercises").recordModify((entries) => entries.filter((e) => e !== entry)),
    ]);
  }

  export function setDayName(
    dispatch: IDispatch,
    editDayLensBuilder: LensBuilder<IState, IProgramDay>,
    name: string
  ): void {
    updateState(dispatch, [editDayLensBuilder.p("name").record(name)]);
  }

  export function addSet(
    dispatch: IDispatch,
    editDayLensBuilder: LensBuilder<IState, IProgramDay>,
    excerciseIndex: number,
    set: IProgramSet,
    setIndex?: number
  ): void {
    updateState(dispatch, [
      editDayLensBuilder
        .p("excercises")
        .i(excerciseIndex)
        .p("sets")
        .recordModify((sets) => {
          if (setIndex != null) {
            return lf(sets).i(setIndex).set(set);
          } else {
            return [...sets, set];
          }
        }),
    ]);
  }

  export function removeSet(
    dispatch: IDispatch,
    editDayLensBuilder: LensBuilder<IState, IProgramDay>,
    excerciseIndex: number,
    setIndex: number
  ): void {
    updateState(dispatch, [
      editDayLensBuilder
        .p("excercises")
        .i(excerciseIndex)
        .p("sets")
        .recordModify((sets) => sets.filter((set, i) => i !== setIndex)),
    ]);
  }

  export function addExcercise(
    dispatch: IDispatch,
    editDayLensBuilder: LensBuilder<IState, IProgramDay>,
    excerciseType: IExcerciseType
  ): void {
    updateState(dispatch, [
      editDayLensBuilder.p("excercises").recordModify((e) => [...e, { excercise: excerciseType, sets: [] }]),
    ]);
  }
}
