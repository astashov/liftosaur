import { Exercise, warmupValues } from "./exercise";
import { ScriptRunner } from "../parser";
import { Progress } from "./progress";
import { Screen } from "./screen";
import { lb, lf } from "lens-shmens";
import { IDispatch } from "../ducks/types";
import { IEither } from "../utils/types";
import { Weight } from "./weight";
import { UidFactory } from "../utils/generator";
import { IState, updateState } from "./state";
import {
  IProgram,
  IProgramDay,
  IStorage,
  IProgramExercise,
  ISettings,
  IHistoryEntry,
  IExerciseType,
  IProgramSet,
  IProgramState,
  ISet,
  IHistoryRecord,
  IWeight,
  IProgramExerciseVariation,
  IEquipment,
  IProgramExerciseWarmupSet,
  IUnit,
} from "../types";
import { ObjectUtils } from "../utils/object";
import { Exporter } from "../utils/exporter";
import { DateUtils } from "../utils/date";
import { ICustomExercise, IProgramContentSettings } from "../types";
import { ProgramExercise } from "./programExercise";
import { Thunk } from "../ducks/thunks";
import { getLatestMigrationVersion } from "../migrations/migrations";
import { Encoder } from "../utils/encoder";
import { IBuilderProgram, IBuilderExercise } from "../pages/builder/models/types";

declare let __HOST__: string;

export interface IExportedProgram {
  program: IProgram;
  customExercises: Partial<Record<string, ICustomExercise>>;
  version: string;
  settings: IProgramContentSettings;
}

export namespace Program {
  export function getProgram(state: IState, id?: string): IProgram | undefined {
    return state.storage.programs.find((p) => p.id === id);
  }

  export function getEditingProgram(state: IState): IProgram | undefined {
    return state.storage.programs.find((p) => p.id === state.editProgram?.id);
  }

  export function getProgramExercise(program: IProgram, id: string): IProgramExercise | undefined {
    return program.exercises.find((p) => p.id === id);
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

  export function getCurrentProgram(storage: IStorage): IProgram | undefined {
    return storage.programs.filter((p) => p.id === storage.currentProgramId)[0];
  }

  export function createDay(name: string): IProgramDay {
    return {
      name,
      exercises: [],
    };
  }

  export function programExerciseToHistoryEntry(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[],
    day: number,
    settings: ISettings,
    staticState?: IProgramState
  ): IHistoryEntry {
    const state = { ...ProgramExercise.getState(programExercise, allProgramExercises), ...staticState };
    const variationIndex = nextVariationIndex(programExercise, allProgramExercises, state, day, settings);
    const sets = ProgramExercise.getVariations(programExercise, allProgramExercises)[variationIndex].sets;

    return nextHistoryEntry(
      programExercise.id,
      programExercise.exerciseType,
      day,
      sets,
      state,
      settings,
      ProgramExercise.getWarmupSets(programExercise, allProgramExercises),
      ProgramExercise.getTimerExpr(programExercise, allProgramExercises),
      true
    );
  }

  export function nextHistoryEntry(
    programExerciseId: string,
    exercise: IExerciseType,
    day: number,
    programSets: IProgramSet[],
    state: IProgramState,
    settings: ISettings,
    warmupSets?: IProgramExerciseWarmupSet[],
    timerExpr?: string,
    shouldFallback?: boolean
  ): IHistoryEntry {
    const sets: ISet[] = programSets.map((set) => {
      const repsValue = ScriptRunner.safe(
        () => {
          return new ScriptRunner(
            set.repsExpr,
            state,
            Progress.createEmptyScriptBindings(day),
            Progress.createScriptFunctions(settings),
            settings.units,
            { equipment: exercise.equipment }
          ).execute("reps");
        },
        (e) => {
          return `There's an error while calculating reps for the next workout for '${exercise.id}' exercise:\n\n${e.message}.\n\nWe fallback to a default 5 reps. Please fix the program's reps script.`;
        },
        5,
        !shouldFallback
      );
      const weightValue = ScriptRunner.safe(
        () => {
          return new ScriptRunner(
            set.weightExpr,
            state,
            Progress.createEmptyScriptBindings(day),
            Progress.createScriptFunctions(settings),
            settings.units,
            { equipment: exercise.equipment }
          ).execute("weight");
        },
        (e) => {
          return `There's an error while calculating weight for the next workout for '${exercise.id}' exercise:\n\n${e.message}.\n\nWe fallback to a default 100${settings.units}. Please fix the program's weight script.`;
        },
        Weight.build(100, settings.units),
        !shouldFallback
      );
      return {
        isAmrap: set.isAmrap,
        label: set.label,
        reps: repsValue,
        weight: Weight.roundConvertTo(weightValue, settings, exercise.equipment),
      };
    });

    return {
      exercise: exercise,
      programExerciseId,
      sets,
      warmupSets: sets[0]?.weight != null ? Exercise.getWarmupSets(exercise, sets[0].weight, settings, warmupSets) : [],
    };
  }

  export function getProgramExerciseById(program: IProgram, id: string): IProgramExercise | undefined {
    return program.exercises.find((e) => e.id === id);
  }

  export function nextProgramRecord(
    program: IProgram,
    settings: ISettings,
    dayIndex?: number,
    staticStates?: Partial<Record<string, IProgramState>>
  ): IHistoryRecord {
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
        const staticState = staticStates?.[id];
        return programExerciseToHistoryEntry(programExercise, program.exercises, day, settings, staticState);
      }),
    };
  }

  export function nextVariationIndex(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[],
    state: IProgramState,
    day: number,
    settings: ISettings
  ): number {
    const variationIndexResult = runVariationScript(programExercise, allProgramExercises, state, day, settings);
    if (!variationIndexResult.success) {
      throw new Error(variationIndexResult.error);
    }
    const variations = ProgramExercise.getVariations(programExercise, allProgramExercises);
    return Math.max(0, Math.min(variationIndexResult.data - 1, variations.length - 1));
  }

  export function parseExerciseFinishDayScript(
    day: number,
    settings: ISettings,
    state: IProgramState,
    script: string,
    equipment?: IEquipment
  ): IEither<unknown, string> {
    const scriptRunner = new ScriptRunner(
      script,
      state,
      Progress.createEmptyScriptBindings(day),
      Progress.createScriptFunctions(settings),
      settings.units,
      { equipment }
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
    script: string,
    equipment?: IEquipment,
    staticState?: IProgramState
  ): IEither<IProgramState, string> {
    const bindings = Progress.createScriptBindings(day, entry);
    const fns = Progress.createScriptFunctions(settings);
    const newState = { ...state, ...staticState };

    try {
      new ScriptRunner(script, newState, bindings, fns, settings.units, { equipment }).execute();
    } catch (e) {
      if (e instanceof SyntaxError) {
        return { success: false, error: e.message };
      } else {
        throw e;
      }
    }
    for (const key of ObjectUtils.keys(staticState || {})) {
      newState[key] = state[key];
    }

    return { success: true, data: newState };
  }

  export function runDescriptionScript(
    script: string,
    equipment: IEquipment | undefined,
    state: IProgramState,
    day: number,
    settings: ISettings
  ): IEither<number, string> {
    try {
      if (script) {
        const scriptRunnerResult = new ScriptRunner(
          script,
          state,
          Progress.createEmptyScriptBindings(day),
          Progress.createScriptFunctions(settings),
          settings.units,
          { equipment }
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

  export function runVariationScript(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[],
    state: IProgramState,
    day: number,
    settings: ISettings
  ): IEither<number, string> {
    const script = ProgramExercise.getVariationScript(programExercise, allProgramExercises);
    try {
      if (script) {
        const scriptRunnerResult = new ScriptRunner(
          script,
          state,
          Progress.createEmptyScriptBindings(day),
          Progress.createScriptFunctions(settings),
          settings.units,
          { equipment: programExercise.exerciseType.equipment }
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
    allProgramExercises: IProgramExercise[],
    script: string,
    day: number,
    settings: ISettings,
    type: "reps"
  ): IEither<number, string>;
  export function runScript(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[],
    script: string,
    day: number,
    settings: ISettings,
    type: "weight"
  ): IEither<IWeight, string>;
  export function runScript(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[],
    script: string,
    day: number,
    settings: ISettings,
    type: string
  ): IEither<IWeight | number, string> {
    try {
      if (script) {
        const scriptRunnerResult = new ScriptRunner(
          script,
          ProgramExercise.getState(programExercise, allProgramExercises),
          Progress.createEmptyScriptBindings(day),
          Progress.createScriptFunctions(settings),
          settings.units,
          { equipment: programExercise.exerciseType.equipment }
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
    allProgramExercises: IProgramExercise[],
    day: number,
    entry: IHistoryEntry,
    settings: ISettings,
    userPromptedStateVars?: IProgramState,
    staticState?: IProgramState
  ): IEither<IProgramState, string> {
    const bindings = Progress.createScriptBindings(day, entry);
    const fns = Progress.createScriptFunctions(settings);

    const state = ProgramExercise.getState(programExercise, allProgramExercises);

    const newState: IProgramState = {
      ...state,
      ...userPromptedStateVars,
      ...staticState,
    };

    try {
      new ScriptRunner(
        ProgramExercise.getFinishDayScript(programExercise, allProgramExercises),
        newState,
        bindings,
        fns,
        settings.units,
        {
          equipment: programExercise.exerciseType.equipment,
        }
      ).execute();
    } catch (e) {
      if (e instanceof SyntaxError) {
        return { success: false, error: e.message };
      } else {
        throw e;
      }
    }

    for (const key of ObjectUtils.keys(staticState || {})) {
      newState[key] = (staticState || {})[key];
    }

    return { success: true, data: newState };
  }

  export function dayAverageTimeMs(program: IProgram, settings: ISettings): number {
    const dayApproxTimes = program.days.map((d, i) => dayApproxTimeMs(i, program, settings));
    return dayApproxTimes.reduce((acc, t) => acc + t, 0) / dayApproxTimes.length;
  }

  export function dayApproxTimeMs(dayIndex: number, program: IProgram, settings: ISettings): number {
    const day = program.days[dayIndex];
    return day.exercises.reduce((acc, e) => {
      const programExercise = program.exercises.find((pe) => pe.id === e.id);
      if (programExercise) {
        return acc + ProgramExercise.approxTimeMs(dayIndex, programExercise, program.exercises, settings);
      } else {
        return acc;
      }
    }, 0);
  }

  export function runAllFinishDayScripts(
    program: IProgram,
    progress: IHistoryRecord,
    settings: ISettings,
    staticStates?: Partial<Record<string, IProgramState>>
  ): IProgram {
    const newProgram = lf(program)
      .p("exercises")
      .modify((es) =>
        es.map((e) => {
          const entry = progress.entries.filter((ent) => ent.programExerciseId === e.id)[0];
          if (entry != null) {
            const staticState = (staticStates || {})[e.id];
            const newStateResult = Program.runFinishDayScript(
              e,
              program.exercises,
              progress.day,
              entry,
              settings,
              progress.userPromptedStateVars?.[e.id],
              staticState
            );
            if (newStateResult.success) {
              const reuseLogicId = e.reuseLogic?.selected;
              if (reuseLogicId) {
                return lf(e).pi("reuseLogic").p("states").p(reuseLogicId).set(newStateResult.data);
              } else {
                return lf(e).p("state").set(newStateResult.data);
              }
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

  export function createExercise(units: IUnit): IProgramExercise {
    const defaultWarmup = warmupValues(units)[45];
    return {
      name: "Squat",
      id: UidFactory.generateUid(8),
      variations: [createVariation(true)],
      exerciseType: {
        id: "squat",
        equipment: "barbell",
      },
      state: {
        weight: units === "kg" ? Weight.build(20, units) : Weight.build(45, units),
      },
      warmupSets: defaultWarmup,
      finishDayExpr: "",
      variationExpr: "1",
      descriptions: [""],
    };
  }

  export function previewProgram(dispatch: IDispatch, programId: string, showCustomPrograms: boolean): void {
    updateState(dispatch, [
      lb<IState>().p("previewProgram").record({
        id: programId,
        showCustomPrograms,
      }),
    ]);
    dispatch(Thunk.pushScreen("programPreview"));
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
    if (programExercise.quickAddSets) {
      errors.push("Must not have Quick Add Sets enabled");
    }
    if (programExercise.reuseLogic?.selected != null) {
      errors.push("Must not reuse another experiment logic");
    }
    if (programExercise.descriptions.length > 1) {
      errors.push("Must not use multiple descriptions");
    }
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
    const firstSet: IProgramSet | undefined = sets[0];
    if (!firstSet) {
      errors.push("Should have at least one set");
    }
    if (!/^\d*$/.test((firstSet?.repsExpr || "").trim())) {
      errors.push("The reps can't be a Liftoscript expression");
    }
    if (sets.some((s) => firstSet?.repsExpr !== s.repsExpr)) {
      errors.push("All sets should have the same reps");
    }
    if (sets.some((s) => s.weightExpr !== "state.weight")) {
      errors.push("All sets should have the weight = <strong>state.weight</strong>");
    }
    if (errors.length > 0) {
      return { success: false, error: errors };
    } else {
      return { success: true, data: true };
    }
  }

  export function exportProgramToFile(program: IProgram, settings: ISettings, version: string): void {
    const payload = exportProgram(program, settings, version);
    Exporter.toFile(
      `liftosaur_${program.name.replace(/\s+/g, "-")}_${DateUtils.formatYYYYMMDD(Date.now())}.json`,
      JSON.stringify(payload, null, 2)
    );
  }

  export async function exportProgramToLink(program: IProgram, settings: ISettings, version: string): Promise<string> {
    const payload = exportProgram(program, settings, version);
    const url = await Encoder.encodeIntoUrl(JSON.stringify(payload), __HOST__);
    url.pathname = "/program";
    return url.toString();
  }

  function exportProgram(program: IProgram, settings: ISettings, version?: string): IExportedProgram {
    const customExerciseIds = program.exercises.reduce<string[]>((memo, programExercise) => {
      const id = programExercise.exerciseType.id;
      const isBuiltIn = !!Exercise.findById(id, {});
      if (!isBuiltIn) {
        memo.push(id);
      }
      return memo;
    }, []);

    const customExercises = ObjectUtils.pick(settings.exercises, customExerciseIds);
    return {
      customExercises,
      program,
      version: version || getLatestMigrationVersion(),
      settings: ObjectUtils.pick(settings, ["units", "timers"]),
    };
  }

  export function planToProgram(plan: IBuilderProgram): IProgram {
    const builderExercises: Record<string, { day: number; exercise: IBuilderExercise }[]> = {};
    let dayIndex = 0;
    for (let weekIndex = 0; weekIndex < plan.weeks.length; weekIndex += 1) {
      for (let dayInWeekIndex = 0; dayInWeekIndex < plan.weeks[weekIndex].days.length; dayInWeekIndex += 1) {
        const day = plan.weeks[weekIndex].days[dayInWeekIndex];
        for (const planExercise of day.exercises) {
          const id = `plan_${planExercise.exerciseType.id}_${planExercise.exerciseType.equipment}`;
          builderExercises[id] = builderExercises[id] || [];
          builderExercises[id].push({ day: dayIndex, exercise: planExercise });
        }
        dayIndex += 1;
      }
    }

    const exercises = Object.keys(builderExercises).map((id) => {
      const ex = builderExercises[id];
      return ProgramExercise.planExercisesToProgramExercise(id, ex);
    });

    return {
      exercises: exercises,
      id: UidFactory.generateUid(8),
      name: plan.name,
      description: "Generated from a Workout Planner",
      url: "",
      author: "",
      nextDay: 1,
      days: plan.weeks.flatMap((week) => {
        return week.days.map((day) => {
          const name = `${week.name} - ${day.name}`;
          return {
            name,
            exercises: day.exercises.map((e) => ({ id: `plan_${e.exerciseType.id}_${e.exerciseType.equipment}` })),
          };
        });
      }),
      tags: [],
    };
  }

  export function switchToUnit(program: IProgram, settings: ISettings): IProgram {
    return { ...program, exercises: program.exercises.map((ex) => ProgramExercise.switchToUnit(ex, settings)) };
  }
}
