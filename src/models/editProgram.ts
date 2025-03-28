import { lb } from "lens-shmens";
import { IEvaluatedProgram, Program } from "./program";
import { Screen } from "./screen";
import { IDispatch } from "../ducks/types";
import { ObjectUtils } from "../utils/object";
import { updateState, IState } from "./state";
import { IProgram, IPlannerProgram, IDayData, IProgramState, ISettings } from "../types";
import { updateStateVariable } from "./editProgramLenses";
import { IPlannerProgramExercise, IPlannerState } from "../pages/planner/models/types";
import { PP } from "./pp";
import { Weight } from "./weight";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import { ProgramToPlanner } from "./programToPlanner";

export namespace EditProgram {
  export function properlyUpdateStateVariableInPlace(
    program: IEvaluatedProgram,
    programExercise: IPlannerProgramExercise,
    values: Partial<IProgramState>
  ): IEvaluatedProgram {
    const state = PlannerProgramExercise.getState(programExercise);
    if (ObjectUtils.entries(values).some(([key, value]) => value == null || Weight.eq(state[key], value))) {
      return program;
    }
    if (!programExercise.progress) {
      return program;
    }
    const newEvalutedProgram = ObjectUtils.clone(program);
    PP.iterate2(newEvalutedProgram.weeks, (ex) => {
      if (ex.key === programExercise.key) {
        const progress = ex.progress;
        if (progress) {
          for (const [stateKey, newValue] of ObjectUtils.entries(values)) {
            if (newValue == null) {
              delete progress.stateMetadata?.[stateKey];
            }
            if (newValue == null || typeof newValue === "string") {
              progress.state = updateStateVariable(state, stateKey, newValue);
            } else {
              progress.state = { ...progress.state, [stateKey]: newValue };
            }
          }
        }
      }
    });
    return newEvalutedProgram;
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

  export function setNextDay(dispatch: IDispatch, programId: string, nextDay: number): void {
    updateState(dispatch, [
      lb<IState>().p("storage").p("programs").findBy("id", programId).p("nextDay").record(nextDay),
    ]);
  }

  export function initPlannerState(id: string, plannerProgram: IPlannerProgram, focusedDay?: IDayData): IPlannerState {
    return {
      id,
      current: { program: { ...Program.create(plannerProgram.name, id), planner: plannerProgram } },
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

  export function updateProgram(dispatch: IDispatch, program: IProgram): void {
    updateState(dispatch, [lb<IState>().p("storage").p("programs").findBy("id", program.id).record(program)]);
  }

  export function regenerateProgram(
    program: IProgram,
    evaluatedProgram: IEvaluatedProgram,
    settings: ISettings
  ): IProgram {
    const newPlanner = new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner();
    return { ...program, planner: newPlanner };
  }
}
