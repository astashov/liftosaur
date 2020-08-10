import { LensBuilder, lf, lb } from "../utils/lens";
import { IState, updateState } from "../ducks/reducer";
import { IProgramDayEntry, IProgramDay } from "./program";
import { IDispatch } from "../ducks/types";
import { IProgramSet } from "./set";
import { IExcerciseId } from "./excercise";
import { IBars } from "./weight";

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
    excerciseId: IExcerciseId,
    bar: keyof IBars
  ): void {
    updateState(dispatch, [
      editDayLensBuilder.p("excercises").recordModify((e) => [
        ...e,
        {
          excercise: {
            id: excerciseId,
            bar: bar,
          },
          sets: [
            {
              repsExpr: "5",
              weightExpr: "0",
              isAmrap: false,
            },
          ],
        },
      ]),
    ]);
  }

  export function reorderDays(
    dispatch: IDispatch,
    programIndex: number,
    startDayIndex: number,
    endDayIndex: number
  ): void {
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("programs")
        .i(programIndex)
        .p("days")
        .recordModify((days) => {
          const newDays = [...days];
          const [daysToMove] = newDays.splice(startDayIndex, 1);
          newDays.splice(endDayIndex, 0, daysToMove);
          return newDays;
        }),
    ]);
  }

  export function reorderExcercises(
    dispatch: IDispatch,
    editDayLensBuilder: LensBuilder<IState, IProgramDay>,
    startExcerciseIndex: number,
    endExceciseIndex: number
  ): void {
    updateState(dispatch, [
      editDayLensBuilder.p("excercises").recordModify((excercises) => {
        const newExcercises = [...excercises];
        const [excercisesToMove] = newExcercises.splice(startExcerciseIndex, 1);
        newExcercises.splice(endExceciseIndex, 0, excercisesToMove);
        return newExcercises;
      }),
    ]);
  }
}
