import { IHistoryRecord } from "./history";
import { Excercise, TExcerciseType } from "./excercise";
import * as t from "io-ts";
import { ISet, TProgramSet } from "./set";
import { ScriptRunner } from "../parser";
import { Progress } from "./progress";
import { ISettings } from "./settings";
import { Screen } from "./screen";
import { updateState, IState } from "../ducks/reducer";
import { lb, ILensRecordingPayload } from "../utils/lens";
import { IDispatch } from "../ducks/types";

export const TProgramDayEntry = t.type(
  {
    excercise: TExcerciseType,
    sets: t.array(TProgramSet),
  },
  "TProgramDayEntry"
);
export type IProgramDayEntry = t.TypeOf<typeof TProgramDayEntry>;

export const TProgramDay = t.type(
  {
    name: t.string,
    excercises: t.array(TProgramDayEntry),
  },
  "TProgramDay"
);
export type IProgramDay = t.TypeOf<typeof TProgramDay>;

export const TProgramInternalState = t.type(
  {
    nextDay: t.number,
  },
  "TProgramInternalState"
);
export type IProgramInternalState = t.TypeOf<typeof TProgramInternalState>;

export const TProgram = t.type(
  {
    id: t.string,
    name: t.string,
    description: t.string,
    days: t.array(TProgramDay),
    state: t.dictionary(t.string, t.number),
    internalState: TProgramInternalState,
    finishDayExpr: t.string,
  },
  "TProgram"
);
export type IProgram = t.TypeOf<typeof TProgram>;

export namespace Program {
  export function getProgram(state: IState, id?: string): IProgram | undefined {
    return state.storage.programs.find((p) => p.id === id);
  }

  export function getEditingProgram(state: IState): IProgram | undefined {
    return state.storage.programs.find((p) => p.id === state.editProgram?.id);
  }

  export function getEditingProgramIndex(state: IState): number {
    return state.storage.programs.findIndex((p) => p.id === state.editProgram?.id);
  }

  export function getEditingDay(state: IState): IProgramDay | undefined {
    return state.storage.programs.find((p) => p.id === state.editProgram?.id)?.days?.[state.editProgram?.dayIndex || 0];
  }

  export function getProgramIndex(state: IState, id: string): number {
    return state.storage.programs.findIndex((p) => p.id === id);
  }

  export function createDay(name: string): IProgramDay {
    return {
      name,
      excercises: [],
    };
  }

  export function nextProgramRecord(program: IProgram, settings: ISettings): IHistoryRecord {
    const day = program.internalState.nextDay || 1;
    const programDay = program.days[day - 1];
    return {
      id: 0,
      date: new Date().toISOString(),
      programId: program.id,
      day,
      startTime: Date.now(),
      entries: programDay.excercises.map((entry) => {
        const sets: ISet[] = entry.sets.map((set) => ({
          isAmrap: set.isAmrap,
          reps: new ScriptRunner(
            set.repsExpr,
            program.state,
            Progress.createEmptyScriptBindings(day),
            Progress.createScriptFunctions(settings)
          ).execute(true),
          weight: new ScriptRunner(
            set.weightExpr,
            program.state,
            Progress.createEmptyScriptBindings(day),
            Progress.createScriptFunctions(settings)
          ).execute(true),
        }));
        return {
          excercise: entry.excercise,
          sets,
          warmupSets: Excercise.getWarmupSets(entry.excercise, sets[0].weight),
        };
      }),
    };
  }

  export function cloneProgram2(dispatch: IDispatch, program: IProgram): void {
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("programs")
        .recordModify((programs) => {
          if (programs.some((p) => p.id === program.id)) {
            if (
              confirm(
                "You already have this program cloned. Do you want to override? All your modifications of this program will be lost."
              )
            ) {
              return programs.map((p) => (p.id === program.id ? program : p));
            } else {
              return programs;
            }
          } else {
            return [...programs, program];
          }
        }),
      ...selectProgram2LensRecordings(program.id),
    ]);
  }

  export function selectProgram(dispatch: IDispatch, programId: string): void {
    updateState(dispatch, selectProgram2LensRecordings(programId));
  }

  export function nextDay(program: IProgram, day?: number): number {
    return (day != null ? day % program.days.length : 0) + 1;
  }

  export function editAction(dispatch: IDispatch, id: string): void {
    updateState(dispatch, [
      lb<IState>().p("editProgram").record({ id }),
      lb<IState>()
        .p("screenStack")
        .recordModify((s) => Screen.push(s, "editProgram")),
    ]);
  }

  function selectProgram2LensRecordings(programId: string): ILensRecordingPayload<IState>[] {
    return [
      lb<IState>().p("storage").p("currentProgramId").record(programId),
      lb<IState>()
        .p("screenStack")
        .recordModify((s) => Screen.push(s, "main")),
    ];
  }
}
