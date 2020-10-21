import { lb, lf, lbu } from "../utils/lens";
import { Program, IProgramExercise, IProgram } from "./program";
import { Screen } from "./screen";
import { IDispatch } from "../ducks/types";
import { IExerciseId, Exercise } from "./exercise";
import { IBarKey, IUnit, Weight, IWeight } from "./weight";
import { UidFactory } from "../utils/generator";
import { ObjectUtils } from "../utils/object";
import { updateState, IState } from "./state";

interface I531Tms {
  squat: IWeight;
  benchPress: IWeight;
  deadlift: IWeight;
  overheadPress: IWeight;
}

export namespace EditProgram {
  export function addStateVariable(dispatch: IDispatch, newName?: string, newType?: IUnit): void {
    if (newName != null && newType != null) {
      updateState(dispatch, [
        lb<IState>()
          .pi("editExercise")
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
        .pi("editExercise")
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

  export function changeExerciseName(dispatch: IDispatch, newName?: string): void {
    updateState(dispatch, [
      lb<IState>()
        .pi("editExercise")
        .p("name")
        .record(newName || ""),
    ]);
  }

  export function changeExerciseId(dispatch: IDispatch, newId?: IExerciseId): void {
    if (newId != null) {
      const exercise = Exercise.get({ id: newId, bar: "barbell" });
      updateState(dispatch, [
        lb<IState>().pi("editExercise").p("exerciseType").p("id").record(exercise.id),
        lb<IState>().pi("editExercise").p("exerciseType").p("bar").record(exercise.defaultBar),
        lb<IState>().pi("editExercise").p("name").record(exercise.name),
      ]);
    }
  }

  export function changeExerciseBar(dispatch: IDispatch, newBar?: IBarKey): void {
    updateState(dispatch, [lb<IState>().pi("editExercise").p("exerciseType").p("bar").record(newBar)]);
  }

  export function setReps(dispatch: IDispatch, value: string, variationIndex: number, setIndex: number): void {
    updateState(dispatch, [
      lb<IState>()
        .pi("editExercise")
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
        .pi("editExercise")
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
        .pi("editExercise")
        .p("variations")
        .i(variationIndex)
        .p("sets")
        .i(setIndex)
        .p("isAmrap")
        .record(value),
    ]);
  }

  export function setExerciseFinishDayExpr(dispatch: IDispatch, value: string): void {
    updateState(dispatch, [lb<IState>().pi("editExercise").p("finishDayExpr").record(value)]);
  }

  export function setExerciseVariationExpr(dispatch: IDispatch, value: string): void {
    updateState(dispatch, [lb<IState>().pi("editExercise").p("variationExpr").record(value)]);
  }

  export function addVariation(dispatch: IDispatch): void {
    updateState(dispatch, [
      lb<IState>()
        .pi("editExercise")
        .p("variations")
        .recordModify((v) => {
          return [...v, Program.createVariation()];
        }),
    ]);
  }

  export function removeVariation(dispatch: IDispatch, variationIndex: number): void {
    updateState(dispatch, [
      lb<IState>()
        .pi("editExercise")
        .p("variations")
        .recordModify((v) => v.filter((_, i) => i !== variationIndex)),
    ]);
  }

  export function setName(dispatch: IDispatch, program: IProgram, name: string): void {
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("programs")
        .recordModify((programs) => {
          const programIndex = programs.findIndex((p) => p.id === program.id);
          return lf(programs).i(programIndex).p("name").set(name);
        }),
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
        .pi("editExercise")
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

  export function setDayName(dispatch: IDispatch, programIndex: number, dayIndex: number, name: string): void {
    updateState(dispatch, [
      lb<IState>().p("storage").p("programs").i(programIndex).p("days").i(dayIndex).p("name").record(name),
    ]);
  }

  export function addSet(dispatch: IDispatch, variationIndex: number): void {
    updateState(dispatch, [
      lb<IState>()
        .pi("editExercise")
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
        .pi("editExercise")
        .p("variations")
        .i(variationIndex)
        .p("sets")
        .recordModify((sets) => sets.filter((s, i) => i !== setIndex)),
    ]);
  }

  export function addProgramExercise(dispatch: IDispatch): void {
    updateState(dispatch, [
      lb<IState>().p("editExercise").record(Program.createExercise()),
      lb<IState>()
        .p("screenStack")
        .recordModify((stack) => Screen.push(stack, "editProgramExercise")),
    ]);
  }

  export function editProgramExercise(dispatch: IDispatch, exercise: IProgramExercise): void {
    updateState(dispatch, [
      lb<IState>().p("editExercise").record(exercise),
      lb<IState>()
        .p("screenStack")
        .recordModify((stack) => Screen.push(stack, "editProgramExercise")),
    ]);
  }

  export function removeProgramExercise(dispatch: IDispatch, program: IProgram, exerciseId: string): void {
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("programs")
        .recordModify((programs) => {
          const programIndex = programs.findIndex((p) => p.id === program.id);
          return lf(programs)
            .i(programIndex)
            .p("exercises")
            .modify((es) => es.filter((e) => e.id !== exerciseId));
        }),
    ]);
  }

  export function copyProgramExercise(dispatch: IDispatch, program: IProgram, exercise: IProgramExercise): void {
    const newName = `${exercise.name} Copy`;
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("programs")
        .recordModify((programs) => {
          const programIndex = programs.findIndex((p) => p.id === program.id);
          return lf(programs)
            .i(programIndex)
            .p("exercises")
            .modify((es) => {
              const newExercise: IProgramExercise = { ...exercise, name: newName, id: UidFactory.generateUid(8) };
              return [...es, newExercise];
            });
        }),
    ]);
  }

  export function toggleDayExercise(
    dispatch: IDispatch,
    program: IProgram,
    dayIndex: number,
    exerciseId: string
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
            .p("exercises")
            .modify((es) => {
              if (es.some((e) => e.id === exerciseId)) {
                return es.filter((e) => e.id !== exerciseId);
              } else {
                return [...es, { id: exerciseId }];
              }
            });
        }),
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

  export function reorderExercises(
    dispatch: IDispatch,
    programIndex: number,
    dayIndex: number,
    startExerciseIndex: number,
    endExceciseIndex: number
  ): void {
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("programs")
        .i(programIndex)
        .p("days")
        .i(dayIndex)
        .p("exercises")
        .recordModify((exercises) => {
          const newExercises = [...exercises];
          const [exercisesToMove] = newExercises.splice(startExerciseIndex, 1);
          newExercises.splice(endExceciseIndex, 0, exercisesToMove);
          return newExercises;
        }),
    ]);
  }

  export function saveExercise(dispatch: IDispatch, programIndex: number): void {
    const exerciseLensGetters = {
      editExercise: lb<IState>().p("editExercise").get(),
      state: lb<IState>().get(),
    };
    updateState(
      dispatch,
      [
        lbu<IState, typeof exerciseLensGetters>(exerciseLensGetters)
          .p("storage")
          .p("programs")
          .i(programIndex)
          .p("exercises")
          .recordModify((exc, getters) => {
            const editExercise = getters.editExercise!;
            const exercise = exc.find((e) => e.id === editExercise.id);
            if (exercise != null) {
              return exc.map((e) => (e.id === editExercise.id ? editExercise : e));
            } else {
              return [...exc, editExercise];
            }
          }),
        lb<IState>()
          .p("screenStack")
          .recordModify((s) => Screen.pull(s)),
        lb<IState>().p("editExercise").record(undefined),
      ],
      "Save Exercise"
    );
  }

  export function set531Tms(dispatch: IDispatch, programIndex: number, tms: I531Tms): void {
    updateState(
      dispatch,
      ObjectUtils.keys(tms).map((exerciseId) => {
        return lb<IState>()
          .p("storage")
          .p("programs")
          .i(programIndex)
          .p("exercises")
          .recordModify((exercises) => {
            return exercises.map((e) =>
              e.exerciseType.id === exerciseId ? { ...e, state: { ...e.state, tm: tms[exerciseId] } } : e
            );
          });
      })
    );
  }

  export function updateSimpleExercise(
    dispatch: IDispatch,
    units: IUnit,
    sets?: number,
    reps?: number,
    weight?: number
  ): void {
    if (sets != null && reps != null && weight != null) {
      updateState(dispatch, [
        lb<IState>()
          .pi("editExercise")
          .p("variations")
          .i(0)
          .p("sets")
          .record(
            Array.apply(null, Array(sets)).map(() => ({
              repsExpr: reps.toString(),
              weightExpr: "state.weight",
              isAmrap: false,
            }))
          ),
        lb<IState>().pi("editExercise").p("state").p("weight").record(Weight.build(weight, units)),
      ]);
    }
  }
}
