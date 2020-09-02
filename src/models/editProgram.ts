import { LensBuilder, lb } from "../utils/lens";
import { IState, updateState } from "../ducks/reducer";
import { IProgramDayEntry, IProgramDay, Program } from "./program";
import { Screen } from "./screen";
import { IDispatch } from "../ducks/types";
import { IExcerciseId } from "./excercise";
import { IBarKey, IUnit, Weight, IWeight } from "./weight";

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

  export function addStateVariable(dispatch: IDispatch, newName?: string, newType?: IUnit): void {
    if (newName != null && newType != null) {
      updateState(dispatch, [
        lb<IState>()
          .pi("editExcercise")
          .p("state")
          .recordModify((state) => {
            const newState = { ...state };
            let newValue: IWeight | number;
            if (newType === "lb" || newType === "kg") {
              newValue = Weight.build(0, newType);
            } else {
              newValue = 0;
            }
            newState[newName] = newValue;
            return newState;
          }),
      ]);
    }
  }

  export function editStateVariable(dispatch: IDispatch, stateKey: string, newValue?: string): void {
    updateState(dispatch, [
      lb<IState>()
        .pi("editExcercise")
        .p("state")
        .recordModify((state) => {
          const v = newValue != null && newValue !== "" ? parseInt(newValue, 10) : null;
          const newState = { ...state };
          const value = state[stateKey];
          if (v != null) {
            newState[stateKey] = Weight.is(value) ? Weight.build(v, value.unit) : v;
          } else {
            delete newState[stateKey];
          }
          return newState;
        }),
    ]);
  }

  export function changeExcerciseName(dispatch: IDispatch, newName?: string): void {
    updateState(dispatch, [
      lb<IState>()
        .pi("editExcercise")
        .p("name")
        .record(newName || ""),
    ]);
  }

  export function changeExcerciseId(dispatch: IDispatch, newId?: IExcerciseId): void {
    if (newId != null) {
      updateState(dispatch, [lb<IState>().pi("editExcercise").p("excerciseType").p("id").record(newId)]);
    }
  }

  export function changeExcerciseBar(dispatch: IDispatch, newBar?: IBarKey): void {
    updateState(dispatch, [lb<IState>().pi("editExcercise").p("excerciseType").p("bar").record(newBar)]);
  }

  export function setReps(dispatch: IDispatch, value: string, variationIndex: number, setIndex: number): void {
    updateState(dispatch, [
      lb<IState>()
        .pi("editExcercise")
        .p("variations")
        .i(variationIndex)
        .p("sets")
        .i(setIndex)
        .p("repsExpr")
        .record(value),
    ]);
  }

  export function setWeight(dispatch: IDispatch, value: string, variationIndex: number, setIndex: number): void {
    updateState(dispatch, [
      lb<IState>()
        .pi("editExcercise")
        .p("variations")
        .i(variationIndex)
        .p("sets")
        .i(setIndex)
        .p("weightExpr")
        .record(value),
    ]);
  }

  export function setAmrap(dispatch: IDispatch, value: boolean, variationIndex: number, setIndex: number): void {
    updateState(dispatch, [
      lb<IState>()
        .pi("editExcercise")
        .p("variations")
        .i(variationIndex)
        .p("sets")
        .i(setIndex)
        .p("isAmrap")
        .record(value),
    ]);
  }

  export function setExcerciseFinishDayExpr(dispatch: IDispatch, value: string): void {
    updateState(dispatch, [lb<IState>().pi("editExcercise").p("finishDayExpr").record(value)]);
  }

  export function addVariation(dispatch: IDispatch): void {
    updateState(dispatch, [
      lb<IState>()
        .pi("editExcercise")
        .p("variations")
        .recordModify((v) => {
          return [...v, Program.createVariation()];
        }),
    ]);
  }

  export function removeVariation(dispatch: IDispatch, variationIndex: number): void {
    updateState(dispatch, [
      lb<IState>()
        .pi("editExcercise")
        .p("variations")
        .recordModify((v) => v.filter((_, i) => i !== variationIndex)),
    ]);
  }

  export function setDayName(
    dispatch: IDispatch,
    editDayLensBuilder: LensBuilder<IState, IProgramDay>,
    name: string
  ): void {
    updateState(dispatch, [editDayLensBuilder.p("name").record(name)]);
  }

  export function addSet(dispatch: IDispatch, variationIndex: number): void {
    updateState(dispatch, [
      lb<IState>()
        .pi("editExcercise")
        .p("variations")
        .i(variationIndex)
        .p("sets")
        .recordModify((sets) => {
          const set = { ...sets[sets.length - 1] };
          return [...sets, set];
        }),
    ]);
  }

  export function removeSet(dispatch: IDispatch, variationIndex: number, setIndex: number): void {
    console.log("Removing", variationIndex, setIndex);
    updateState(dispatch, [
      lb<IState>()
        .pi("editExcercise")
        .p("variations")
        .i(variationIndex)
        .p("sets")
        .recordModify((sets) => sets.filter((s, i) => i !== setIndex)),
    ]);
  }

  export function addProgramExcercise(dispatch: IDispatch): void {
    updateState(dispatch, [
      lb<IState>().p("editExcercise").record(Program.createExcercise()),
      lb<IState>()
        .p("screenStack")
        .recordModify((stack) => Screen.push(stack, "editProgramExcercise")),
    ]);
  }

  export function addExcercise(
    dispatch: IDispatch,
    editDayLensBuilder: LensBuilder<IState, IProgramDay>,
    excerciseId: IExcerciseId,
    bar?: IBarKey
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
