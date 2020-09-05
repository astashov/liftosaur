import { IHistoryRecord, IHistoryEntry } from "./history";
import { Excercise, TExcerciseType, IExcerciseType } from "./excercise";
import * as t from "io-ts";
import { ISet, TProgramSet, IProgramSet } from "./set";
import { ScriptRunner } from "../parser";
import { Progress } from "./progress";
import { ISettings } from "./settings";
import { Screen } from "./screen";
import { updateState, IState } from "../ducks/reducer";
import { lb, ILensRecordingPayload } from "../utils/lens";
import { IDispatch } from "../ducks/types";
import { IEither, IArrayElement } from "../utils/types";
import { TWeight, Weight } from "./weight";
import { UidFactory } from "../utils/generator";

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
    excercises: t.array(
      t.intersection([
        t.interface({
          id: t.string,
        }),
        t.partial({
          variation: t.number,
        }),
      ])
    ),
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

export const TProgramState = t.dictionary(t.string, t.union([t.number, TWeight]), "TProgramState");
export type IProgramState = t.TypeOf<typeof TProgramState>;

const tags = ["first-starter", "beginner", "barbell", "dumbbell"] as const;

export const TProgramTag = t.keyof(
  tags.reduce<Record<IArrayElement<typeof tags>, null>>((memo, barKey) => {
    memo[barKey] = null;
    return memo;
  }, {} as Record<IArrayElement<typeof tags>, null>),
  "TProgramTag"
);
export type IProgramTag = t.TypeOf<typeof TProgramTag>;

export const TProgramExcerciseVariation = t.type(
  {
    sets: t.array(TProgramSet),
  },
  "TProgramExcerciseVariation"
);
export type IProgramExcerciseVariation = t.TypeOf<typeof TProgramExcerciseVariation>;

export const TProgramExcercise = t.type(
  {
    excerciseType: TExcerciseType,
    id: t.string,
    name: t.string,
    variations: t.array(TProgramExcerciseVariation),
    state: TProgramState,
    variationExpr: t.string,
    finishDayExpr: t.string,
  },
  "TProgramExcercise"
);
export type IProgramExcercise = t.TypeOf<typeof TProgramExcercise>;

export const TProgram = t.type(
  {
    excercises: t.array(TProgramExcercise),
    id: t.string,
    name: t.string,
    description: t.string,
    url: t.string,
    author: t.string,
    nextDay: t.number,
    days: t.array(TProgramDay),
    tags: t.array(TProgramTag),
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

  export function nextHistoryEntry(
    excercise: IExcerciseType,
    day: number,
    programSets: IProgramSet[],
    state: IProgramState,
    settings: ISettings
  ): IHistoryEntry {
    const sets: ISet[] = programSets.map((set) => {
      const repsValue = new ScriptRunner(
        set.repsExpr,
        state,
        Progress.createEmptyScriptBindings(day),
        Progress.createScriptFunctions(settings),
        settings.units
      ).execute("reps");
      const weightValue = new ScriptRunner(
        set.weightExpr,
        state,
        Progress.createEmptyScriptBindings(day),
        Progress.createScriptFunctions(settings),
        settings.units
      ).execute("weight");
      return {
        isAmrap: set.isAmrap,
        reps: repsValue,
        weight: Weight.convertTo(weightValue, settings.units),
      };
    });
    return {
      excercise: excercise,
      sets,
      warmupSets: sets[0]?.weight != null ? Excercise.getWarmupSets(excercise, sets[0].weight, settings) : [],
    };
  }

  export function nextProgramRecord(program: IProgram, settings: ISettings, dayIndex?: number): IHistoryRecord {
    const day = Math.min(dayIndex || program.internalState.nextDay || 1, program.days.length);
    const programDay = program.days[day - 1];
    return {
      id: 0,
      date: new Date().toISOString(),
      programId: program.id,
      programName: program.name,
      day,
      dayName: programDay.name,
      startTime: Date.now(),
      entries: programDay.excercises.map((entry) => {
        return nextHistoryEntry(entry.excercise, day, entry.sets, program.state, settings);
      }),
    };
  }

  export function getState(program: IProgram): Record<string, number> {
    return { ...program.internalState, ...program.state };
  }

  export function parseExcerciseFinishDayScript(
    day: number,
    settings: ISettings,
    state: IProgramState,
    script: string
  ): IEither<unknown, string> {
    const scriptRunner = new ScriptRunner(
      script,
      state,
      Progress.createEmptyScriptBindings(day),
      Progress.createScriptFunctions(settings),
      settings.units
    );

    try {
      return { success: true, data: scriptRunner.parse() };
    } catch (e) {
      if (e instanceof SyntaxError) {
        return { success: false, error: e.message };
      } else {
        throw e;
      }
    }
  }

  export function runExcerciseFinishDayScript(
    entry: IHistoryEntry,
    day: number,
    settings: ISettings,
    state: IProgramState,
    script: string
  ): IEither<IProgramState, string> {
    const bindings = Progress.createScriptBindings(day, entry);
    const fns = Progress.createScriptFunctions(settings);
    const newState: IProgramState = { ...state };

    try {
      new ScriptRunner(script, newState, bindings, fns, settings.units).execute();
    } catch (e) {
      if (e instanceof SyntaxError) {
        return { success: false, error: e.message };
      } else {
        throw e;
      }
    }

    return { success: true, data: newState };
  }

  export function runFinishDayScript(
    program: IProgram,
    progress: IHistoryRecord,
    settings: ISettings,
    script: string = program.finishDayExpr
  ): IEither<IProgramState, string> {
    const bindings = Progress.createScriptBindings(progress);
    const fns = Progress.createScriptFunctions(settings);
    const newInternalState: IProgramInternalState = {
      nextDay: Program.nextDay(program, program.internalState.nextDay),
    };
    const newState: Record<string, number> = { ...newInternalState, ...program.state };

    try {
      new ScriptRunner(script, newState, bindings, fns, settings.units).execute();
    } catch (e) {
      if (e instanceof SyntaxError) {
        return { success: false, error: e.message };
      } else {
        throw e;
      }
    }

    return { success: true, data: newState };
  }

  export function createVariation(): IProgramExcerciseVariation {
    return {
      sets: [
        {
          repsExpr: "5",
          weightExpr: "0lb",
          isAmrap: false,
        },
      ],
    };
  }

  export function createExcercise(): IProgramExcercise {
    return {
      name: "Squat",
      id: UidFactory.generateUid(8),
      variations: [createVariation()],
      excerciseType: {
        id: "squat",
        bar: "barbell",
      },
      state: {},
      finishDayExpr: "",
      variationExpr: "1",
    };
  }

  export function cloneProgram(dispatch: IDispatch, program: IProgram): void {
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
