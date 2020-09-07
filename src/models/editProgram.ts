import { LensBuilder, lb, lf } from "../utils/lens";
import { IState, updateState } from "../ducks/reducer";
import {
  IProgramDayEntry,
  IProgramDay,
  Program,
  IProgramExcercise,
  IProgram,
  IProgramExcerciseVariation,
} from "./program";
import { Screen } from "./screen";
import { IDispatch } from "../ducks/types";
import { IExcerciseId, excercises, Excercise } from "./excercise";
import { IBarKey, IUnit, Weight, IWeight } from "./weight";
import { UidFactory } from "../utils/generator";

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
      const excercise = Excercise.get({ id: newId, bar: "barbell" });
      updateState(dispatch, [
        lb<IState>().pi("editExcercise").p("excerciseType").p("id").record(excercise.id),
        lb<IState>().pi("editExcercise").p("excerciseType").p("bar").record(excercise.defaultBar),
        lb<IState>().pi("editExcercise").p("name").record(excercise.name),
      ]);
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

  export function setExcerciseVariationExpr(dispatch: IDispatch, value: string): void {
    updateState(dispatch, [lb<IState>().pi("editExcercise").p("variationExpr").record(value)]);
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

  export function setNextDay(dispatch: IDispatch, program: IProgram, nextDay: number): void {
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("programs")
        .recordModify((programs) => {
          const programIndex = programs.findIndex((p) => p.id === program.id);
          return lf(programs).i(programIndex).p("nextDay").set(nextDay);
        }),
    ]);
  }

  export function reorderSets(
    dispatch: IDispatch,
    variationIndex: number,
    startSetIndex: number,
    endSetIndex: number
  ): void {
    updateState(dispatch, [
      lb<IState>()
        .pi("editExcercise")
        .p("variations")
        .i(variationIndex)
        .p("sets")
        .recordModify((sets) => {
          const newSets = [...sets];
          const [setsToMove] = newSets.splice(startSetIndex, 1);
          newSets.splice(endSetIndex, 0, setsToMove);
          return newSets;
        }),
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

  export function editProgramExcercise(dispatch: IDispatch, excercise: IProgramExcercise): void {
    updateState(dispatch, [
      lb<IState>().p("editExcercise").record(excercise),
      lb<IState>()
        .p("screenStack")
        .recordModify((stack) => Screen.push(stack, "editProgramExcercise")),
    ]);
  }

  export function removeProgramExcercise(dispatch: IDispatch, program: IProgram, excerciseId: string): void {
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("programs")
        .recordModify((programs) => {
          const programIndex = programs.findIndex((p) => p.id === program.id);
          return lf(programs)
            .i(programIndex)
            .p("excercises")
            .modify((es) => es.filter((e) => e.id !== excerciseId));
        }),
    ]);
  }

  export function copyProgramExcercise(dispatch: IDispatch, program: IProgram, excercise: IProgramExcercise): void {
    const newName = `${excercise.name} Copy`;
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("programs")
        .recordModify((programs) => {
          const programIndex = programs.findIndex((p) => p.id === program.id);
          return lf(programs)
            .i(programIndex)
            .p("excercises")
            .modify((es) => {
              const newExcercise: IProgramExcercise = { ...excercise, name: newName, id: UidFactory.generateUid(8) };
              return [...es, newExcercise];
            });
        }),
    ]);
  }

  export function toggleDayExcercise(
    dispatch: IDispatch,
    program: IProgram,
    dayIndex: number,
    excerciseId: string
  ): void {
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("programs")
        .recordModify((programs) => {
          const programIndex = programs.findIndex((p) => p.id === program.id);
          return lf(programs)
            .i(programIndex)
            .p("days")
            .i(dayIndex)
            .p("excercises")
            .modify((es) => {
              if (es.some((e) => e.id === excerciseId)) {
                return es.filter((e) => e.id !== excerciseId);
              } else {
                return [...es, { id: excerciseId }];
              }
            });
        }),
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
