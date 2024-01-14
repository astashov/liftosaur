import { Exercise, exercises, warmupValues } from "./exercise";
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
  IEquipmentData,
  IProgramWeek,
  IDayData,
  IExerciseData,
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
import { CollectionUtils } from "../utils/collection";
import { StringUtils } from "../utils/string";
import { ILiftoscriptEvaluatorVariables } from "../liftoscriptEvaluator";
import { PlannerToProgram2 } from "./plannerToProgram2";

declare let __HOST__: string;

export interface IExportedProgram {
  program: IProgram;
  customExercises: Partial<Record<string, ICustomExercise>>;
  customEquipment?: Partial<Record<string, IEquipmentData>>;
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

  export function storageToExportedProgram(storage: IStorage, programId: string): IExportedProgram | undefined {
    const program = storage.programs.find((p) => p.id === programId);
    if (!program) {
      return undefined;
    }
    const settings = storage.settings;
    return {
      program: program,
      customExercises: settings.exercises,
      customEquipment: settings.equipment,
      version: storage.version,
      settings: settings,
    };
  }

  export function createDay(name: string): IProgramDay {
    return {
      id: UidFactory.generateUid(8),
      name,
      exercises: [],
    };
  }

  export function createWeek(name: string): IProgramWeek {
    return {
      id: UidFactory.generateUid(8),
      name,
      days: [],
    };
  }

  export function programExerciseToHistoryEntry(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[],
    dayData: IDayData,
    settings: ISettings,
    staticState?: IProgramState
  ): IHistoryEntry {
    const state = { ...ProgramExercise.getState(programExercise, allProgramExercises), ...staticState };
    const variationIndex = nextVariationIndex(programExercise, allProgramExercises, state, dayData, settings, true);
    const sets = ProgramExercise.getVariations(programExercise, allProgramExercises)[variationIndex].sets;

    return nextHistoryEntry(
      programExercise.id,
      programExercise.exerciseType,
      dayData,
      sets,
      state,
      settings,
      ProgramExercise.getEnableRpe(programExercise, allProgramExercises),
      ProgramExercise.getEnableRepRanges(programExercise, allProgramExercises),
      ProgramExercise.getWarmupSets(programExercise, allProgramExercises),
      true
    );
  }

  export function nextHistoryEntry(
    programExerciseId: string,
    exercise: IExerciseType,
    dayData: IDayData,
    programSets: IProgramSet[],
    state: IProgramState,
    settings: ISettings,
    enabledRpe: boolean,
    enabledRepRanges: boolean,
    warmupSets?: IProgramExerciseWarmupSet[],
    shouldFallback?: boolean
  ): IHistoryEntry {
    const sets: ISet[] = programSets.map((set) => {
      const repsValue = ScriptRunner.safe(
        () => {
          return new ScriptRunner(
            set.repsExpr,
            state,
            Progress.createEmptyScriptBindings(dayData, settings, exercise),
            Progress.createScriptFunctions(settings),
            settings.units,
            { equipment: exercise.equipment },
            "regular"
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
            Progress.createEmptyScriptBindings(dayData, settings, exercise),
            Progress.createScriptFunctions(settings),
            settings.units,
            { equipment: exercise.equipment },
            "regular"
          ).execute("weight");
        },
        (e) => {
          return `There's an error while calculating weight for the next workout for '${exercise.id}' exercise:\n\n${e.message}.\n\nWe fallback to a default 100${settings.units}. Please fix the program's weight script.`;
        },
        Weight.build(100, settings.units),
        !shouldFallback
      );
      const rpeExpr = set.rpeExpr;
      const rpeValue =
        enabledRpe && rpeExpr?.trim()
          ? ScriptRunner.safe(
              () => {
                return new ScriptRunner(
                  rpeExpr,
                  state,
                  Progress.createEmptyScriptBindings(dayData, settings, exercise),
                  Progress.createScriptFunctions(settings),
                  settings.units,
                  { equipment: exercise.equipment },
                  "regular"
                ).execute("rpe");
              },
              (e) => {
                return `There's an error while calculating RPE for the next workout for '${exercise.id}' exercise:\n\n${e.message}.\n\nPlease fix the program's RPE script.`;
              },
              undefined,
              !shouldFallback
            )
          : undefined;
      const minRepsExpr = set.minRepsExpr;
      const minRepsValue =
        enabledRepRanges && minRepsExpr?.trim()
          ? ScriptRunner.safe(
              () => {
                return new ScriptRunner(
                  minRepsExpr,
                  state,
                  Progress.createEmptyScriptBindings(dayData, settings, exercise),
                  Progress.createScriptFunctions(settings),
                  settings.units,
                  { equipment: exercise.equipment },
                  "regular"
                ).execute("reps");
              },
              (e) => {
                return `There's an error while calculating Min Reps for the next workout for '${exercise.id}' exercise:\n\n${e.message}.\n\nPlease fix the program's Min Reps script.`;
              },
              undefined,
              !shouldFallback
            )
          : undefined;
      return {
        isAmrap: set.isAmrap,
        label: set.label,
        reps: repsValue,
        minReps: minRepsValue,
        rpe: rpeValue,
        logRpe: set.logRpe,
        weight: weightValue,
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

  export function getProgramExerciseFromEntry(
    allProgramExercises: IProgramExercise[],
    entry?: IHistoryEntry
  ): IProgramExercise | undefined {
    return allProgramExercises.find((e) => e.id === entry?.programExerciseId);
  }

  export function nextProgramRecord(
    program: IProgram,
    settings: ISettings,
    dayIndex?: number,
    staticStates?: Partial<Record<string, IProgramState>>
  ): IHistoryRecord {
    const day = Math.max(1, Math.min(numberOfDays(program), Math.max(1, (dayIndex || program.nextDay) ?? 0)));
    if (program.planner != null) {
      const newProgram = new PlannerToProgram2(program, program.planner, settings).convertToProgram();
      const planner = new PlannerToProgram2(newProgram, program.planner, settings).convertToPlanner();
      program = newProgram;
    }

    const programDay = getProgramDay(program, day);
    const week = getWeekFromDay(program, day);
    const dayInWeek = getDayInWeek(program, day);
    const dayData: IDayData = {
      day,
      week,
      dayInWeek,
    };

    const dayName = program.isMultiweek ? `${program.weeks[week - 1].name} - ${programDay.name}` : programDay.name;
    return {
      id: 0,
      date: new Date().toISOString(),
      programId: program.id,
      programName: program.name,
      day,
      week,
      dayInWeek,
      dayName,
      startTime: Date.now(),
      entries: programDay.exercises.map(({ id }) => {
        const programExercise = program.exercises.find((e) => id === e.id)!;
        const staticState = staticStates?.[id];
        return programExerciseToHistoryEntry(programExercise, program.exercises, dayData, settings, staticState);
      }),
    };
  }

  export function nextVariationIndex(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[],
    state: IProgramState,
    dayData: IDayData,
    settings: ISettings,
    shouldFallback?: boolean
  ): number {
    const variationIndexResult = runVariationScript(
      programExercise,
      allProgramExercises,
      state,
      dayData,
      settings,
      shouldFallback
    );
    if (!variationIndexResult.success) {
      throw new Error(variationIndexResult.error);
    }
    const variations = ProgramExercise.getVariations(programExercise, allProgramExercises);
    return Math.max(0, Math.min(variationIndexResult.data - 1, variations.length - 1));
  }

  export function parseExerciseFinishDayScript(
    dayData: IDayData,
    settings: ISettings,
    state: IProgramState,
    script: string,
    equipment?: IEquipment
  ): IEither<unknown, string> {
    const scriptRunner = new ScriptRunner(
      script,
      state,
      Progress.createEmptyScriptBindings(dayData, settings),
      Progress.createScriptFunctions(settings),
      settings.units,
      { equipment },
      "regular"
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
    dayData: IDayData,
    settings: ISettings,
    state: IProgramState,
    script: string,
    staticState?: IProgramState
  ): IEither<{ state: IProgramState; variables: ILiftoscriptEvaluatorVariables }, string> {
    const bindings = Progress.createScriptBindings(dayData, entry, settings);
    const fns = Progress.createScriptFunctions(settings);
    const newState = { ...state, ...staticState };
    let variables: ILiftoscriptEvaluatorVariables = {};

    try {
      const runner = new ScriptRunner(
        script,
        newState,
        bindings,
        fns,
        settings.units,
        {
          equipment: entry.exercise.equipment,
        },
        "regular"
      );
      runner.execute();
      variables = runner.getVariables();
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

    return { success: true, data: { state: newState, variables } };
  }

  export function runDescriptionScript(
    script: string,
    exercise: IExerciseType,
    state: IProgramState,
    dayData: IDayData,
    settings: ISettings
  ): IEither<number, string> {
    try {
      if (script) {
        const scriptRunnerResult = new ScriptRunner(
          script,
          state,
          Progress.createEmptyScriptBindings(dayData, settings, exercise),
          Progress.createScriptFunctions(settings),
          settings.units,
          { equipment: exercise.equipment },
          "regular"
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
    dayData: IDayData,
    settings: ISettings,
    shouldFallback?: boolean
  ): IEither<number, string> {
    const script = ProgramExercise.getVariationScript(programExercise, allProgramExercises);
    try {
      if (script) {
        const scriptRunnerResult = ScriptRunner.safe(
          () => {
            return new ScriptRunner(
              script,
              state,
              Progress.createEmptyScriptBindings(dayData, settings, programExercise.exerciseType),
              Progress.createScriptFunctions(settings),
              settings.units,
              { equipment: programExercise.exerciseType.equipment },
              "regular"
            ).execute("reps");
          },
          (e) => {
            return `There's an error while calculating variation script for the next workout for '${programExercise.exerciseType.id}' exercise:\n\n${e.message}.\n\nWe fallback to a default - 1st variation. Please fix the program's variation script.`;
          },
          1,
          !shouldFallback
        );

        return { success: true, data: scriptRunnerResult };
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
    dayData: IDayData,
    settings: ISettings,
    type: "reps" | "rpe"
  ): IEither<number, string>;
  export function runScript(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[],
    script: string,
    dayData: IDayData,
    settings: ISettings,
    type: "weight"
  ): IEither<IWeight, string>;
  export function runScript(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[],
    script: string,
    dayData: IDayData,
    settings: ISettings,
    type: "reps" | "rpe" | "weight"
  ): IEither<IWeight | number, string> {
    try {
      if (script) {
        const scriptRunnerResult = new ScriptRunner(
          script,
          ProgramExercise.getState(programExercise, allProgramExercises),
          Progress.createEmptyScriptBindings(dayData, settings, programExercise.exerciseType),
          Progress.createScriptFunctions(settings),
          settings.units,
          { equipment: programExercise.exerciseType.equipment },
          "regular"
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
    dayData: IDayData,
    entry: IHistoryEntry,
    settings: ISettings,
    userPromptedStateVars?: IProgramState,
    staticState?: IProgramState
  ): IEither<{ state: IProgramState; variables?: ILiftoscriptEvaluatorVariables }, string> {
    const bindings = Progress.createScriptBindings(dayData, entry, settings);
    const fns = Progress.createScriptFunctions(settings);

    const state = ProgramExercise.getState(programExercise, allProgramExercises);

    const newState: IProgramState = {
      ...state,
      ...userPromptedStateVars,
      ...staticState,
    };

    let variables: ILiftoscriptEvaluatorVariables | undefined;
    try {
      const runner = new ScriptRunner(
        ProgramExercise.getFinishDayScript(programExercise, allProgramExercises),
        newState,
        bindings,
        fns,
        settings.units,
        {
          equipment: programExercise.exerciseType.equipment,
        },
        "regular"
      );
      runner.execute();
      variables = runner.getVariables();
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

    return { success: true, data: { state: newState, variables } };
  }

  export function dayAverageTimeMs(program: IProgram, settings: ISettings): number {
    const dayApproxTimes = program.days.map((d, i) => {
      const dayData = Program.getDayData(program, i + 1);
      return dayApproxTimeMs(dayData, program, settings);
    });
    return dayApproxTimes.reduce((acc, t) => acc + t, 0) / dayApproxTimes.length;
  }

  export function dayApproxTimeMs(dayData: IDayData, program: IProgram, settings: ISettings): number {
    const day = program.days[dayData.day - 1];
    return day.exercises.reduce((acc, e) => {
      const programExercise = program.exercises.find((pe) => pe.id === e.id);
      if (programExercise) {
        return acc + ProgramExercise.approxTimeMs(dayData, programExercise, program.exercises, settings);
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
  ): { program: IProgram; exerciseData: IExerciseData } {
    const exerciseData: IExerciseData = {};
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
              Progress.getDayData(progress),
              entry,
              settings,
              progress.userPromptedStateVars?.[e.id],
              staticState
            );
            if (newStateResult.success) {
              const { state, variables } = newStateResult.data;
              if (variables?.rm1 != null) {
                exerciseData[Exercise.toKey(entry.exercise)] = { rm1: variables.rm1 };
              }
              const reuseLogicId = e.reuseLogic?.selected;
              if (reuseLogicId) {
                return lf(e).pi("reuseLogic").p("states").p(reuseLogicId).set(state);
              } else {
                return lf(e).p("state").set(state);
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
    return {
      program: lf(newProgram).p("nextDay").set(nextDay(newProgram, progress.day)),
      exerciseData,
    };
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
        weight: units === "kg" ? exercises.squat.startingWeightKg : exercises.squat.startingWeightLb,
      },
      warmupSets: defaultWarmup,
      finishDayExpr: "",
      variationExpr: "1",
      descriptions: [""],
      stateMetadata: {},
      reuseLogic: { selected: undefined, states: {} },
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
          const newProgram = { ...program, clonedAt: Date.now() };
          if (programs.some((p) => p.id === program.id)) {
            if (
              confirm(
                "You already have this program cloned. Do you want to override? All your modifications of this program will be lost."
              )
            ) {
              return programs.map((p) => (p.id === newProgram.id ? newProgram : p));
            } else {
              return programs;
            }
          } else {
            return [...programs, newProgram];
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

  export function numberOfDays(program: IProgram): number {
    return program.isMultiweek ? program.weeks.reduce((memo, w) => memo + w.days.length, 0) : program.days.length;
  }

  export function daysRange(program: IProgram): string {
    if (program.isMultiweek) {
      const minDays = Math.min(...program.weeks.map((w) => w.days.length));
      const maxDays = Math.max(...program.weeks.map((w) => w.days.length));
      if (minDays === maxDays) {
        return `${minDays} ${StringUtils.pluralize("day", minDays)} per week`;
      } else {
        return `${minDays}-${maxDays} days per week`;
      }
    } else {
      return `${program.days.length} ${StringUtils.pluralize("day", program.days.length)}`;
    }
  }

  export function exerciseRange(program: IProgram): string {
    const minExs = Math.min(...program.days.map((w) => w.exercises.length));
    const maxExs = Math.max(...program.days.map((w) => w.exercises.length));
    if (minExs === maxExs) {
      return `${minExs} ${StringUtils.pluralize("exercise", minExs)} per day`;
    } else {
      return `${minExs}-${maxExs} exercises per day`;
    }
  }

  export function getWeekFromDay(program: IProgram, day: number): number {
    if (program.isMultiweek) {
      let daysTotal = 0;
      const d = day - 1;
      for (let i = 0; i < program.weeks.length; i += 1) {
        const weekDays = program.weeks[i].days.length;
        daysTotal += weekDays;
        if (daysTotal > d) {
          return i + 1;
        }
      }
    }

    return 1;
  }

  export function getDayData(program: IProgram, day: number): IDayData {
    return {
      day,
      week: Program.getWeekFromDay(program, day),
      dayInWeek: Program.getDayInWeek(program, day),
    };
  }

  export function getDayInWeek(program: IProgram, day: number): number {
    if (program.isMultiweek) {
      let daysTotal = 0;
      const d = day - 1;
      for (let i = 0; i < program.weeks.length; i += 1) {
        const weekDays = program.weeks[i].days.length;
        daysTotal += weekDays;
        if (daysTotal > d) {
          const beginningOfWeek = daysTotal - weekDays;
          return d - beginningOfWeek + 1;
        }
      }
    }

    return day;
  }

  export function getListOfDays(program: IProgram): [string, string][] {
    if (program.isMultiweek) {
      const result: [string, string][] = [];
      let dayIndex = 1;
      for (const week of program.weeks) {
        for (const day of week.days) {
          const programDay = program.days.find((d) => d.id === day.id);
          if (programDay) {
            result.push([`${dayIndex}`, `${week.name} - ${programDay.name}`]);
            dayIndex += 1;
          }
        }
      }
      return result;
    } else {
      return program.days.map<[string, string]>((day, i) => [`${i + 1}`, day.name]);
    }
  }

  export function getProgramDayIndex(program: IProgram, day: number): number {
    const programDay = getProgramDay(program, day);
    return program.days.findIndex((d) => d.id === programDay.id);
  }

  export function getProgramDay(program: IProgram, day: number): IProgramDay {
    const d = day - 1;
    if (program.isMultiweek) {
      let daysTotal = 0;
      let weekIndex = 0;
      let dayIndex = 0;
      for (let i = 0; i < program.weeks.length; i += 1) {
        const weekDays = program.weeks[i].days.length;
        daysTotal += weekDays;
        if (daysTotal > d) {
          weekIndex = i;
          dayIndex = d - (daysTotal - weekDays);
          break;
        }
      }
      const dayId = program.weeks[weekIndex].days[dayIndex]?.id;
      const programDay = program.days.find((pd) => pd.id === dayId) || program.days[0];
      return programDay;
    } else {
      return program.days[d];
    }
  }

  export function nextDay(program: IProgram, day?: number): number {
    const nd = (day != null ? day % numberOfDays(program) : 0) + 1;
    return isNaN(nd) ? 1 : nd;
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
    if (programExercise.enableRepRanges) {
      errors.push("Must not have Rep Ranges enabled");
    }
    if (programExercise.enableRpe) {
      errors.push("Must not have RPE enabled");
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

    const customEquipment = ObjectUtils.pick(
      settings.equipment,
      Object.keys(settings.equipment).filter((e) => settings.equipment[e]?.name)
    );
    const customExercises = ObjectUtils.pick(settings.exercises, customExerciseIds);
    return {
      customExercises,
      customEquipment,
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

    const exrcs = Object.keys(builderExercises).map((id) => {
      const ex = builderExercises[id];
      return ProgramExercise.planExercisesToProgramExercise(id, ex);
    });

    return {
      exercises: exrcs,
      id: UidFactory.generateUid(8),
      name: plan.name,
      description: "Generated from a Workout Planner",
      url: "",
      author: "",
      nextDay: 1,
      deletedDays: [],
      deletedExercises: [],
      deletedWeeks: [],
      clonedAt: Date.now(),
      weeks: [],
      isMultiweek: false,
      days: plan.weeks.flatMap((week) => {
        return week.days.map((day) => {
          const name = `${week.name} - ${day.name}`;
          return {
            id: UidFactory.generateUid(8),
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

  export function isChanged(aProgram: IProgram, bProgram: IProgram): boolean {
    const { ...cleanedAProgram } = aProgram;
    const { ...cleanedBProgram } = bProgram;
    const changed = !ObjectUtils.isEqual(cleanedAProgram, cleanedBProgram);
    if (changed) {
      const paths = ObjectUtils.diffPaths(cleanedAProgram, cleanedBProgram);
      return paths.some((p) => {
        return !p.match(/exercises.\d+.state/) && !p.match(/exercises.\d+.reuseLogic\.states/) && !p.match(/nextDay/);
      });
    }
    return false;
  }

  export function mergePrograms(oldProgram: IProgram, newProgram: IProgram, enforceNew: boolean = false): IProgram {
    const deletedWeeks = new Set([...(oldProgram.deletedWeeks || []), ...(newProgram.deletedWeeks || [])]);
    const deletedDays = new Set([...(oldProgram.deletedDays || []), ...(newProgram.deletedDays || [])]);
    const deletedExercises = new Set([...(oldProgram.deletedExercises || []), ...(newProgram.deletedExercises || [])]);
    return {
      id: newProgram.id,
      name: newProgram.name,
      description: newProgram.description,
      url: newProgram.url,
      author: newProgram.author,
      nextDay: newProgram.nextDay,
      days: CollectionUtils.concatBy(oldProgram.days, newProgram.days, (p) => p.id)
        .map((d) => ({ ...d, exercises: d.exercises.filter((e) => !deletedExercises.has(e.id)) }))
        .filter((d) => !deletedDays.has(d.id)),
      deletedDays: Array.from(deletedDays),
      weeks: CollectionUtils.concatBy(oldProgram.weeks, newProgram.weeks, (p) => p.id)
        .map((d) => ({ ...d, days: d.days.filter((e) => !deletedDays.has(e.id)) }))
        .filter((d) => !deletedWeeks.has(d.id)),
      deletedWeeks: Array.from(deletedWeeks),
      isMultiweek: newProgram.isMultiweek,
      tags: newProgram.tags,
      shortDescription: newProgram.shortDescription,
      exercises: CollectionUtils.concatBy(
        oldProgram.exercises,
        newProgram.exercises.map((e) => {
          const oldExercise = oldProgram.exercises.find((oe) => oe.id === e.id);
          if (oldExercise) {
            const mergedExercise = ProgramExercise.mergeExercises(oldExercise, e, enforceNew);
            return mergedExercise;
          } else {
            return e;
          }
        }),
        (e) => e.id
      ).filter((e) => !deletedExercises.has(e.id)),
      deletedExercises: Array.from(deletedExercises),
      clonedAt: newProgram.clonedAt || oldProgram.clonedAt,
    };
  }
}
