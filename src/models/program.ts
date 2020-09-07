import { IHistoryRecord, IHistoryEntry } from "./history";
import { Excercise, TExcerciseType, IExcerciseType } from "./excercise";
import * as t from "io-ts";
import { ISet, TProgramSet, IProgramSet } from "./set";
import { ScriptRunner } from "../parser";
import { Progress } from "./progress";
import { ISettings } from "./settings";
import { Screen } from "./screen";
import { updateState, IState } from "../ducks/reducer";
import { lb, ILensRecordingPayload, lf } from "../utils/lens";
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
      t.type({
        id: t.string,
      })
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
    const day = Math.max(program.days.length, Math.min(1, dayIndex || program.nextDay));
    const programDay = program.days[day - 1];
    return {
      id: 0,
      date: new Date().toISOString(),
      programId: program.id,
      programName: program.name,
      day,
      dayName: programDay.name,
      startTime: Date.now(),
      entries: programDay.excercises.map(({ id }) => {
        const programExcercise = program.excercises.find((e) => id === e.id)!;
        const variationIndex = nextVariationIndex(programExcercise, day, settings);
        const sets = programExcercise.variations[variationIndex].sets;
        return nextHistoryEntry(programExcercise.excerciseType, day, sets, programExcercise.state, settings);
      }),
    };
  }

  export function nextVariationIndex(programExcercise: IProgramExcercise, day: number, settings: ISettings): number {
    const variationIndexResult = runVariationScript(programExcercise, day, settings);
    if (!variationIndexResult.success) {
      throw new Error(variationIndexResult.error);
    }
    return Math.max(0, Math.min(variationIndexResult.data - 1, programExcercise.variations.length - 1));
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

  export function runVariationScript(
    programExcercise: IProgramExcercise,
    day: number,
    settings: ISettings
  ): IEither<number, string> {
    const script = programExcercise.variationExpr;
    try {
      if (script) {
        const scriptRunnerResult = new ScriptRunner(
          script,
          programExcercise.state,
          Progress.createEmptyScriptBindings(day),
          Progress.createScriptFunctions(settings),
          settings.units
        );
        return { success: true, data: scriptRunnerResult.execute("reps") };
      } else {
        return { success: false, error: "Empty expression" };
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        return { success: false, error: e.message };
      } else {
        throw e;
      }
    }
  }

  export function runFinishDayScript(
    programExcercise: IProgramExcercise,
    day: number,
    entry: IHistoryEntry,
    settings: ISettings
  ): IEither<IProgramState, string> {
    const bindings = Progress.createScriptBindings(day, entry);
    const fns = Progress.createScriptFunctions(settings);
    const newState: IProgramState = { ...programExcercise.state };

    try {
      new ScriptRunner(programExcercise.finishDayExpr, newState, bindings, fns, settings.units).execute();
    } catch (e) {
      if (e instanceof SyntaxError) {
        return { success: false, error: e.message };
      } else {
        throw e;
      }
    }

    return { success: true, data: newState };
  }

  export function runAllFinishDayScripts(program: IProgram, progress: IHistoryRecord, settings: ISettings): IProgram {
    const programDay = program.days[progress.day - 1];
    const newProgram = lf(program)
      .p("excercises")
      .modify((es) =>
        es.map((e) => {
          const excIndex = programDay.excercises.findIndex((exc) => exc.id === e.id);
          if (excIndex !== -1) {
            const newStateResult = Program.runFinishDayScript(e, progress.day, progress.entries[excIndex], settings);
            if (newStateResult.success) {
              return lf(e).p("state").set(newStateResult.data);
            } else {
              alert(
                `There's an error while executing Finish Day Script of '${e.name}' excercise:\n\n${newStateResult.error}.\n\nState Variables won't be updated for that excercise. Please fix the program's Finish Day Script.`
              );
            }
          }
          return e;
        })
      );
    return lf(newProgram).p("nextDay").set(nextDay(newProgram, progress.day));
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
