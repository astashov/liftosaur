import { IHistoryRecord, IHistoryEntry } from "./history";
import { Exercise, TExerciseType, IExerciseType } from "./exercise";
import * as t from "io-ts";
import { ISet, TProgramSet, IProgramSet } from "./set";
import { ScriptRunner } from "../parser";
import { Progress } from "./progress";
import { ISettings } from "./settings";
import { Screen } from "./screen";
import { lb, lf } from "../utils/lens";
import { IDispatch } from "../ducks/types";
import { IEither, IArrayElement } from "../utils/types";
import { TWeight, Weight, IWeight } from "./weight";
import { UidFactory } from "../utils/generator";
import { IState, updateState } from "./state";

export const TProgramDayEntry = t.type(
  {
    exercise: TExerciseType,
    sets: t.array(TProgramSet),
  },
  "TProgramDayEntry"
);
export type IProgramDayEntry = Readonly<t.TypeOf<typeof TProgramDayEntry>>;

export const TProgramDay = t.type(
  {
    name: t.string,
    exercises: t.array(
      t.type({
        id: t.string,
      })
    ),
  },
  "TProgramDay"
);
export type IProgramDay = Readonly<t.TypeOf<typeof TProgramDay>>;

export const TProgramState = t.dictionary(t.string, t.union([t.number, TWeight]), "TProgramState");
export type IProgramState = t.TypeOf<typeof TProgramState>;

const tags = ["first-starter", "beginner", "barbell", "dumbbell", "intermediate"] as const;

export const TProgramTag = t.keyof(
  tags.reduce<Record<IArrayElement<typeof tags>, null>>((memo, barKey) => {
    memo[barKey] = null;
    return memo;
  }, {} as Record<IArrayElement<typeof tags>, null>),
  "TProgramTag"
);
export type IProgramTag = Readonly<t.TypeOf<typeof TProgramTag>>;

export const TProgramExerciseVariation = t.type(
  {
    sets: t.array(TProgramSet),
  },
  "TProgramExerciseVariation"
);
export type IProgramExerciseVariation = Readonly<t.TypeOf<typeof TProgramExerciseVariation>>;

export const TProgramExercise = t.type(
  {
    exerciseType: TExerciseType,
    id: t.string,
    name: t.string,
    variations: t.array(TProgramExerciseVariation),
    state: TProgramState,
    variationExpr: t.string,
    finishDayExpr: t.string,
  },
  "TProgramExercise"
);
export type IProgramExercise = Readonly<t.TypeOf<typeof TProgramExercise>>;

export const TProgram = t.type(
  {
    exercises: t.array(TProgramExercise),
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
export type IProgram = Readonly<t.TypeOf<typeof TProgram>>;

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
      exercises: [],
    };
  }

  export function nextHistoryEntry(
    exercise: IExerciseType,
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
        weight: Weight.roundConvertTo(weightValue, settings, exercise.equipment),
      };
    });
    return {
      exercise: exercise,
      sets,
      warmupSets: sets[0]?.weight != null ? Exercise.getWarmupSets(exercise, sets[0].weight, settings) : [],
    };
  }

  export function nextProgramRecord(program: IProgram, settings: ISettings, dayIndex?: number): IHistoryRecord {
    const day = Math.min(program.days.length, Math.max(1, dayIndex || program.nextDay));
    const programDay = program.days[day - 1];
    return {
      id: 0,
      date: new Date().toISOString(),
      programId: program.id,
      programName: program.name,
      day,
      dayName: programDay.name,
      startTime: Date.now(),
      entries: programDay.exercises.map(({ id }) => {
        const programExercise = program.exercises.find((e) => id === e.id)!;
        const variationIndex = nextVariationIndex(programExercise, day, settings);
        const sets = programExercise.variations[variationIndex].sets;
        return nextHistoryEntry(programExercise.exerciseType, day, sets, programExercise.state, settings);
      }),
    };
  }

  export function nextVariationIndex(programExercise: IProgramExercise, day: number, settings: ISettings): number {
    const variationIndexResult = runVariationScript(programExercise, day, settings);
    if (!variationIndexResult.success) {
      throw new Error(variationIndexResult.error);
    }
    return Math.max(0, Math.min(variationIndexResult.data - 1, programExercise.variations.length - 1));
  }

  export function parseExerciseFinishDayScript(
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

  export function runExerciseFinishDayScript(
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
    programExercise: IProgramExercise,
    day: number,
    settings: ISettings
  ): IEither<number, string> {
    const script = programExercise.variationExpr;
    try {
      if (script) {
        const scriptRunnerResult = new ScriptRunner(
          script,
          programExercise.state,
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

  export function runScript(
    programExercise: IProgramExercise,
    script: string,
    day: number,
    settings: ISettings,
    type: "reps"
  ): IEither<number, string>;
  export function runScript(
    programExercise: IProgramExercise,
    script: string,
    day: number,
    settings: ISettings,
    type: "weight"
  ): IEither<IWeight, string>;
  export function runScript(
    programExercise: IProgramExercise,
    script: string,
    day: number,
    settings: ISettings,
    type: string
  ): IEither<IWeight | number, string> {
    try {
      if (script) {
        const scriptRunnerResult = new ScriptRunner(
          script,
          programExercise.state,
          Progress.createEmptyScriptBindings(day),
          Progress.createScriptFunctions(settings),
          settings.units
        );
        return { success: true, data: scriptRunnerResult.execute(type as "reps") };
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
    programExercise: IProgramExercise,
    day: number,
    entry: IHistoryEntry,
    settings: ISettings
  ): IEither<IProgramState, string> {
    const bindings = Progress.createScriptBindings(day, entry);
    const fns = Progress.createScriptFunctions(settings);
    const newState: IProgramState = { ...programExercise.state };

    try {
      new ScriptRunner(programExercise.finishDayExpr, newState, bindings, fns, settings.units).execute();
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
      .p("exercises")
      .modify((es) =>
        es.map((e) => {
          const excIndex = programDay.exercises.findIndex((exc) => exc.id === e.id);
          if (excIndex !== -1) {
            const newStateResult = Program.runFinishDayScript(e, progress.day, progress.entries[excIndex], settings);
            if (newStateResult.success) {
              return lf(e).p("state").set(newStateResult.data);
            } else {
              alert(
                `There's an error while executing Finish Day Script of '${e.name}' exercise:\n\n${newStateResult.error}.\n\nState Variables won't be updated for that exercise. Please fix the program's Finish Day Script.`
              );
            }
          }
          return e;
        })
      );
    return lf(newProgram).p("nextDay").set(nextDay(newProgram, progress.day));
  }

  export function createVariation(useStateWeight?: boolean): IProgramExerciseVariation {
    return {
      sets: [
        {
          repsExpr: "5",
          weightExpr: useStateWeight ? "state.weight" : "0lb",
          isAmrap: false,
        },
      ],
    };
  }

  export function createExercise(): IProgramExercise {
    return {
      name: "Squat",
      id: UidFactory.generateUid(8),
      variations: [createVariation(true)],
      exerciseType: {
        id: "squat",
        equipment: "barbell",
      },
      state: {
        weight: Weight.build(45, "lb"),
      },
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
      lb<IState>().p("storage").p("currentProgramId").record(program.id),
    ]);
  }

  export function selectProgram(dispatch: IDispatch, programId: string): void {
    updateState(dispatch, [
      lb<IState>().p("storage").p("currentProgramId").record(programId),
      lb<IState>()
        .p("screenStack")
        .recordModify((s) => Screen.push(s, "main")),
    ]);
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

  export function isEligibleForSimpleExercise(programExercise: IProgramExercise): IEither<true, string[]> {
    const errors = [];
    if (programExercise.state.weight == null) {
      const keys = Object.keys(programExercise.state)
        .map((k) => `<strong>${k}</strong>`)
        .join(", ");
      errors.push(`Must have 'weight' state variable. But has - ${keys}`);
    }
    if (programExercise.variations.length !== 1) {
      errors.push("Should only have one variation");
    }
    const variation = programExercise.variations[0];
    const sets = variation.sets;
    if (!/^\d*$/.test(sets[0].repsExpr.trim())) {
      errors.push("The reps can't be a Liftoscript expression");
    }
    if (sets.some((s) => sets[0].repsExpr !== s.repsExpr)) {
      errors.push("All sets should have the same reps");
    }
    if (sets[0].weightExpr !== "state.weight") {
      errors.push("All sets should have the weight = <strong>state.weight</strong>");
    }
    if (sets.some((s) => sets[0].weightExpr !== s.weightExpr)) {
      errors.push("All sets should have the same weight expression");
    }
    if (errors.length > 0) {
      return { success: false, error: errors };
    } else {
      return { success: true, data: true };
    }
  }
}
