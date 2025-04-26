import { lb } from "lens-shmens";
import { emptyProgramId, IEvaluatedProgram, Program } from "./program";
import { IDispatch } from "../ducks/types";
import { ObjectUtils } from "../utils/object";
import { updateState, IState } from "./state";
import { IProgram, IDayData, IProgramState, ISettings } from "../types";
import { updateStateVariable } from "./editProgramLenses";
import { IPlannerProgramExercise, IPlannerState } from "../pages/planner/models/types";
import { PP } from "./pp";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import { ProgramToPlanner } from "./programToPlanner";
import { Thunk } from "../ducks/thunks";

export namespace EditProgram {
  export function properlyUpdateStateVariableInPlace(
    program: IEvaluatedProgram,
    programExercise: IPlannerProgramExercise,
    values: Partial<IProgramState>
  ): IEvaluatedProgram {
    const state = PlannerProgramExercise.getState(programExercise);
    values = ObjectUtils.diff(state, values);
    if (ObjectUtils.keys(values).length === 0) {
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
        .p("currentProgramId")
        .recordModify((id) =>
          id === program.id ? (customPrograms.filter((p) => p.id !== program.id)[0]?.id ?? emptyProgramId) : id
        ),
      lb<IState>()
        .p("storage")
        .p("deletedPrograms")
        .recordModify((pgms) => (program.clonedAt ? [...pgms, program.clonedAt] : pgms)),
    ]);
  }

  export function setName(dispatch: IDispatch, program: IProgram, name: string): void {
    updateState(dispatch, [
      lb<IState>().p("storage").p("programs").findBy("id", program.id).p("name").record(name),
      lb<IState>().p("storage").p("programs").findBy("id", program.id).pi("planner").p("name").record(name),
    ]);
  }

  export function setNextDay(dispatch: IDispatch, programId: string, nextDay: number): void {
    updateState(dispatch, [
      lb<IState>().p("storage").p("programs").findBy("id", programId).p("nextDay").record(nextDay),
    ]);
  }

  export function initPlannerState(id: string, program: IProgram, focusedDay?: IDayData): IPlannerState {
    return {
      id,
      current: { program: { ...program } },
      ui: { weekIndex: 0, focusedDay, isUiMode: true, exerciseUi: { edit: new Set(), collapsed: new Set() } },
      history: { past: [], future: [] },
    };
  }

  export function create(dispatch: IDispatch, name: string): void {
    const newProgram = {
      ...Program.create(name),
      planner: {
        name,
        weeks: [{ name: "Week 1", days: [{ name: "Day 1", exerciseText: "" }] }],
      },
    };

    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("programs")
        .recordModify((pgms) => [...pgms, newProgram]),
      lb<IState>().p("storage").p("currentProgramId").record(newProgram.id),
    ]);
    dispatch(Thunk.pushToEditProgram());
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
