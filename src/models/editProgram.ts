import { lb } from "lens-shmens";
import { Program } from "./program";
import { Screen } from "./screen";
import { IDispatch } from "../ducks/types";
import { ObjectUtils } from "../utils/object";
import { updateState, IState } from "./state";
import {
  IProgram,
  IProgramExercise,
  ISettings,
  IExerciseType,
  IPlannerProgram,
  IDayData,
  IProgramState,
} from "../types";
import { EditProgramLenses, updateStateVariable } from "./editProgramLenses";
import { IPlannerState } from "../pages/planner/models/types";
import { ProgramToPlanner } from "./programToPlanner";

export namespace EditProgram {
  export function properlyUpdateStateVariableInPlace(
    dispatch: IDispatch,
    program: IProgram,
    programExercise: IProgramExercise,
    settings: ISettings,
    values: Partial<IProgramState>
  ): void {
    if (program.planner) {
      const programCopy = ObjectUtils.clone(program);
      const ex = programCopy.exercises.find((e) => e.id === programExercise.id);
      if (ex != null) {
        for (const [stateKey, newValue] of ObjectUtils.entries(values)) {
          if (newValue == null) {
            delete ex?.stateMetadata?.[stateKey];
          }
          if (newValue == null || typeof newValue === "string") {
            ex.state = updateStateVariable(ex.state, stateKey, newValue);
          } else {
            ex.state = { ...ex.state, [stateKey]: newValue };
          }
        }
        const newPlanner = new ProgramToPlanner(programCopy, program.planner, settings, {}, {}).convertToPlanner();
        updateState(dispatch, [
          lb<IState>().p("storage").p("programs").findBy("id", program.id).p("planner").record(newPlanner),
        ]);
      }
    } else {
      updateState(
        dispatch,
        EditProgramLenses.properlyUpdateStateVariable(
          lb<IState>()
            .p("storage")
            .p("programs")
            .findBy("id", program.id)
            .p("exercises")
            .findBy("id", programExercise.id),
          programExercise,
          values
        )
      );
    }
  }

  export function swapExercise(
    dispatch: IDispatch,
    settings: ISettings,
    programId: string,
    programExerciseId: string,
    oldExerciseType: IExerciseType,
    newExerciseType?: IExerciseType
  ): void {
    if (newExerciseType != null) {
      updateState(
        dispatch,
        EditProgramLenses.changeExercise(
          lb<IState>()
            .p("storage")
            .p("programs")
            .find((p) => p.id === programId)
            .p("exercises")
            .find((e) => e.id === programExerciseId),
          settings,
          oldExerciseType,
          newExerciseType
        )
      );
    }
  }

  export function deleteProgram(dispatch: IDispatch, program: IProgram, customPrograms: IProgram[]): void {
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("programs")
        .recordModify((pgms) => pgms.filter((p) => p.id !== program.id)),
      lb<IState>()
        .p("storage")
        .p("deletedPrograms")
        .recordModify((pgms) => (program.clonedAt ? [...pgms, program.clonedAt] : pgms)),
      lb<IState>()
        .p("storage")
        .p("currentProgramId")
        .recordModify((id) => (id === program.id ? customPrograms.filter((p) => p.id !== program.id)[0].id : id)),
      lb<IState>()
        .p("storage")
        .p("deletedPrograms")
        .recordModify((pgms) => (program.clonedAt ? [...pgms, program.clonedAt] : pgms)),
    ]);
  }

  export function setName(dispatch: IDispatch, program: IProgram, name: string): void {
    updateState(dispatch, [lb<IState>().p("storage").p("programs").findBy("id", program.id).p("name").record(name)]);
  }

  export function setNextDay(dispatch: IDispatch, program: IProgram, nextDay: number): void {
    updateState(dispatch, [
      lb<IState>().p("storage").p("programs").findBy("id", program.id).p("nextDay").record(nextDay),
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

  export function initPlannerState(id: string, plannerProgram: IPlannerProgram, focusedDay?: IDayData): IPlannerState {
    return {
      id,
      current: { program: plannerProgram },
      ui: { weekIndex: 0, focusedDay, isUiMode: true, exerciseUi: { edit: new Set(), collapsed: new Set() } },
      history: { past: [], future: [] },
    };
  }

  export function initializePlanner(
    dispatch: IDispatch,
    id: string,
    plannerProgram: IPlannerProgram,
    focusedDay?: IDayData
  ): void {
    const initialState = initPlannerState(id, plannerProgram, focusedDay);
    updateState(dispatch, [lb<IState>().p("editProgramV2").record(initialState)]);
  }

  export function createExperimental(dispatch: IDispatch, name: string): void {
    const newProgram = {
      ...Program.create(name),
      planner: {
        name,
        weeks: [{ name: "Week 1", days: [{ name: "Day 1", exerciseText: "" }] }],
      },
    };

    initializePlanner(dispatch, newProgram.id, newProgram.planner!);
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("programs")
        .recordModify((pgms) => [...pgms, newProgram]),
      lb<IState>().p("storage").p("currentProgramId").record(newProgram.id),
      lb<IState>()
        .p("screenStack")
        .recordModify((stack) => Screen.push(stack, "editProgram")),
      lb<IState>().p("editProgram").record({ id: newProgram.id }),
    ]);
  }
}
