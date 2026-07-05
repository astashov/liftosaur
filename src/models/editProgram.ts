import { lb } from "lens-shmens";
import {
  emptyProgramId,
  IEvaluatedProgram,
  Program_evaluate,
  Program_getFirstProgramExercise,
  Program_create,
  Program_createFromHistoryRecord,
} from "./program";
import { IDispatch } from "../ducks/types";
import { ObjectUtils_diff, ObjectUtils_keys, ObjectUtils_clone, ObjectUtils_entries } from "../utils/object";
import { updateState, IState } from "./state";
import { IProgram, IDayData, IProgramState, ISettings, IHistoryRecord } from "../types";
import { Dialog_alert } from "../utils/dialog";
import { updateStateVariable } from "./editProgramLenses";
import { IPlannerProgramExercise, IPlannerExerciseState, IPlannerState } from "../pages/planner/models/types";
import { PP_iterate2 } from "./pp";
import { PlannerProgramExercise_getState } from "../pages/planner/models/plannerProgramExercise";
import { ProgramToPlanner } from "./programToPlanner";
import { Thunk_pushToEditProgram } from "../ducks/thunks";

export function EditProgram_properlyUpdateStateVariableInPlace(
  program: IEvaluatedProgram,
  programExercise: IPlannerProgramExercise,
  values: Partial<IProgramState>
): IEvaluatedProgram {
  const state = PlannerProgramExercise_getState(programExercise);
  values = ObjectUtils_diff(state, values);
  if (ObjectUtils_keys(values).length === 0) {
    return program;
  }
  if (!programExercise.progress) {
    return program;
  }
  const newEvalutedProgram = ObjectUtils_clone(program);
  PP_iterate2(newEvalutedProgram.weeks, (ex) => {
    if (ex.key === programExercise.key) {
      const progress = ex.progress;
      if (progress) {
        for (const [stateKey, newValue] of ObjectUtils_entries(values)) {
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

export function EditProgram_deleteProgram(dispatch: IDispatch, program: IProgram, customPrograms: IProgram[]): void {
  updateState(
    dispatch,
    [
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
    ],
    "Delete program"
  );
}

export function EditProgram_setName(dispatch: IDispatch, program: IProgram, name: string): void {
  updateState(
    dispatch,
    [
      lb<IState>().p("storage").p("programs").findBy("id", program.id).p("name").record(name),
      lb<IState>().p("storage").p("programs").findBy("id", program.id).pi("planner").p("name").record(name),
    ],
    "Update program name"
  );
}

export function EditProgram_setNextDay(dispatch: IDispatch, programId: string, nextDay: number): void {
  updateState(
    dispatch,
    [lb<IState>().p("storage").p("programs").findBy("id", programId).p("nextDay").record(nextDay)],
    "Set next day"
  );
}

export function EditProgram_initPlannerState(
  id: string,
  program: IProgram,
  focusedDay?: IDayData,
  key?: string
): IPlannerState {
  return {
    id,
    current: { program },
    ui: {
      weekIndex: focusedDay?.week != null ? focusedDay.week - 1 : 0,
      focusedDay: focusedDay ? { ...focusedDay, key } : undefined,
      mode: "ui",
      exerciseUi: { edit: new Set(), collapsed: new Set() },
      dayUi: { collapsed: new Set() },
      weekUi: { collapsed: new Set() },
    },
    history: { past: [], future: [] },
  };
}

export function EditProgram_initPlannerProgramExerciseState(
  program: IProgram,
  settings: ISettings,
  key: string,
  dayData: Required<IDayData>,
  fromWorkout: boolean
): IPlannerExerciseState {
  const evaluatedProgram = Program_evaluate(program, settings);
  const programExercise = Program_getFirstProgramExercise(evaluatedProgram, key);
  return {
    current: { program },
    history: { past: [], future: [] },
    ui: {
      weekIndex: dayData.week - 1,
      isProgressEnabled: !!programExercise?.progress,
      isUpdateEnabled: !!programExercise?.update,
      isExerciseVariationsEnabled: (programExercise?.exerciseVariations?.length ?? 0) > 1,
      modeTabIndex: fromWorkout ? 1 : 0,
      acrossWeeksTabIndex: fromWorkout ? 1 : undefined,
      fromWorkout,
    },
  };
}

// A composite-key change (exercise-type swap, or add/remove/reorder of exercise variations) re-keys the
// exercise. The keyed edit state lives at `${programId}_${key}`, so we clone it to the new key, reset undo
// history (the key boundary is a commit point undo can't cross), and stash `pendingNewKey` on the old
// entry — NavScreenProgram reacts by re-pointing the route via setParams and dropping the orphan.
export function EditProgram_migrateExerciseStateKey(
  dispatch: IDispatch,
  programId: string,
  oldStateKey: string,
  newKey: string
): void {
  const newStateKey = `${programId}_${newKey}`;
  updateState(
    dispatch,
    [
      lb<IState>()
        .p("editProgramExerciseStates")
        .recordModify((states) => {
          const currentState = states[oldStateKey];
          if (!currentState) {
            return states;
          }
          return {
            ...states,
            [oldStateKey]: { ...currentState, ui: { ...currentState.ui, pendingNewKey: newKey } },
            [newStateKey]: {
              ...currentState,
              history: { past: [], future: [] },
              ui: {
                ...currentState.ui,
                exercisePickerState: undefined,
                exercisePickerChange: undefined,
                exercisePickerVariationIndex: undefined,
              },
            },
          };
        }),
    ],
    "Update exercise key"
  );
}

export function EditProgram_create(dispatch: IDispatch, name: string): void {
  const newProgram: IProgram = {
    ...Program_create(name),
    planner: {
      vtype: "planner",
      name,
      weeks: [{ name: "Week 1", days: [{ name: "Day 1", exerciseText: "" }] }],
    },
  };

  updateState(
    dispatch,
    [
      lb<IState>()
        .p("storage")
        .p("programs")
        .recordModify((pgms) => [...pgms, newProgram]),
      lb<IState>().p("storage").p("currentProgramId").record(newProgram.id),
    ],
    "Create program"
  );
  dispatch(Thunk_pushToEditProgram());
}

export function EditProgram_createFromHistoryRecord(
  dispatch: IDispatch,
  name: string,
  record: IHistoryRecord,
  settings: ISettings
): void {
  const program = Program_createFromHistoryRecord(name, record, settings);
  updateState(
    dispatch,
    [
      lb<IState>()
        .p("storage")
        .p("programs")
        .recordModify((pgms) => [...pgms, program]),
    ],
    "Create program from adhoc"
  );
  Dialog_alert(`Created new program '${program.name}' with this workout`);
}

export function EditProgram_updateProgram(dispatch: IDispatch, program: IProgram): void {
  updateState(
    dispatch,
    [lb<IState>().p("storage").p("programs").findBy("id", program.id).record(program)],
    "Update program"
  );
}

export function EditProgram_regenerateProgram(
  program: IProgram,
  evaluatedProgram: IEvaluatedProgram,
  settings: ISettings
): IProgram {
  const newPlanner = new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner();
  return { ...program, planner: newPlanner };
}
