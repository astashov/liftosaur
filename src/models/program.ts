import { Exercise, exercises, IExercise, warmupValues } from "./exercise";
import { ScriptRunner } from "../parser";
import { Progress } from "./progress";
import { Screen } from "./screen";
import { lb, lf } from "lens-shmens";
import { IDispatch } from "../ducks/types";
import { parser as plannerExerciseParser } from "../pages/planner/plannerExerciseParser";
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
  IAllCustomExercises,
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
import { IPlannerProgram, IPlannerProgramExercise } from "../pages/planner/models/types";
import { PlannerExerciseEvaluator } from "../pages/planner/plannerExerciseEvaluator";
import { Settings } from "./settings";

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
            Progress.createEmptyScriptBindings(dayData),
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
            Progress.createEmptyScriptBindings(dayData),
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
      const rpeExpr = set.rpeExpr;
      const rpeValue =
        enabledRpe && rpeExpr?.trim()
          ? ScriptRunner.safe(
              () => {
                return new ScriptRunner(
                  rpeExpr,
                  state,
                  Progress.createEmptyScriptBindings(dayData),
                  Progress.createScriptFunctions(settings),
                  settings.units,
                  { equipment: exercise.equipment }
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
                  Progress.createEmptyScriptBindings(dayData),
                  Progress.createScriptFunctions(settings),
                  settings.units,
                  { equipment: exercise.equipment }
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

  export function nextProgramRecord(
    program: IProgram,
    settings: ISettings,
    dayIndex?: number,
    staticStates?: Partial<Record<string, IProgramState>>
  ): IHistoryRecord {
    const day = Math.min(numberOfDays(program), Math.max(1, dayIndex || program.nextDay));
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
      Progress.createEmptyScriptBindings(dayData),
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
    dayData: IDayData,
    settings: ISettings,
    state: IProgramState,
    script: string,
    equipment?: IEquipment,
    staticState?: IProgramState
  ): IEither<IProgramState, string> {
    const bindings = Progress.createScriptBindings(dayData, entry);
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
    dayData: IDayData,
    settings: ISettings
  ): IEither<number, string> {
    try {
      if (script) {
        const scriptRunnerResult = new ScriptRunner(
          script,
          state,
          Progress.createEmptyScriptBindings(dayData),
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
              Progress.createEmptyScriptBindings(dayData),
              Progress.createScriptFunctions(settings),
              settings.units,
              { equipment: programExercise.exerciseType.equipment }
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
          Progress.createEmptyScriptBindings(dayData),
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
    dayData: IDayData,
    entry: IHistoryEntry,
    settings: ISettings,
    userPromptedStateVars?: IProgramState,
    staticState?: IProgramState
  ): IEither<IProgramState, string> {
    const bindings = Progress.createScriptBindings(dayData, entry);
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
              Progress.getDayData(progress),
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
        weight: units === "kg" ? exercises.squat.startingWeightKg : exercises.squat.startingWeightLb,
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

  export function numberOfDays(program: IProgram): number {
    return program.isMultiweek ? program.weeks.reduce((memo, w) => memo + w.days.length, 0) : program.days.length;
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
    return (day != null ? day % numberOfDays(program) : 0) + 1;
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

  export function plannerToProgram(plannerProgram: IPlannerProgram, customExercises: IAllCustomExercises): IProgram {
    const evaluatedWeeks = plannerProgram.weeks.map((week) => {
      return week.days.map((day) => {
        const tree = plannerExerciseParser.parse(day.exerciseText);
        const evaluator = new PlannerExerciseEvaluator(day.exerciseText, customExercises);
        return evaluator.evaluate(tree.topNode);
      });
    });

    const exercisesToWeeksDays: Record<
      string,
      { dayData: { week: number; dayInWeek: number }[]; exercises: string[] }
    > = {};
    for (let week = 0; week < evaluatedWeeks.length; week += 1) {
      for (let day = 0; day < evaluatedWeeks[week].length; day += 1) {
        const result = evaluatedWeeks[week][day];
        if (result.success) {
          const exs = result.data;
          const names = exs.map((e) => e.name);
          const key = names.join("|");
          exercisesToWeeksDays[key] = exercisesToWeeksDays[key] || {};
          exercisesToWeeksDays[key].dayData = exercisesToWeeksDays[key].dayData || [];
          exercisesToWeeksDays[key].exercises = exercisesToWeeksDays[key].exercises || [];
          exercisesToWeeksDays[key].dayData.push({ week, dayInWeek: day });
          exercisesToWeeksDays[key].exercises = names;
        }
      }
    }

    const plannerExercises: Record<
      string,
      { week: number; day: number; dayInWeek: number; exercises: IPlannerProgramExercise[] }[]
    > = {};
    let dayIndex = 0;
    for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex += 1) {
      const week = evaluatedWeeks[weekIndex];
      for (let dayInWeekIndex = 0; dayInWeekIndex < week.length; dayInWeekIndex += 1) {
        const day = week[dayInWeekIndex];
        if (day.success) {
          const excrs = day.data;
          const exercisesByName: Record<string, IPlannerProgramExercise[]> = {};
          for (const exercise of excrs) {
            exercisesByName[exercise.name] = exercisesByName[exercise.name] || [];
            exercisesByName[exercise.name].push(exercise);
          }
          for (const groupedExercises of ObjectUtils.values(exercisesByName)) {
            plannerExercises[groupedExercises[0].name] = plannerExercises[groupedExercises[0].name] || [];
            plannerExercises[groupedExercises[0].name].push({
              week: weekIndex,
              day: dayIndex,
              dayInWeek: dayInWeekIndex,
              exercises: groupedExercises,
            });
          }
        }
        dayIndex += 1;
      }
    }

    const settings = Settings.build();
    const intermediateSets: Record<
      string,
      Record<string, { encounters: IDayData[]; sets: IProgramSet[]; schema: string; exercise: IExercise }>
    > = {};
    for (const exerciseGrouped of ObjectUtils.values(plannerExercises)) {
      let isWithRepRanges = false;
      const exercise = Exercise.findByName(exerciseGrouped[0].exercises[0].name, settings.exercises);
      if (!exercise) {
        continue;
      }

      for (const item of exerciseGrouped) {
        const programSets: IProgramSet[] = [];
        const exs = item.exercises;

        for (const ex of exs) {
          for (const set of ex.sets) {
            if (set.repRange) {
              for (let i = 0; i < set.repRange.numberOfSets; i += 1) {
                const multiplier = Weight.rpeMultiplier(set.repRange.maxrep, set.rpe || 10);
                const minrep = set.repRange.minrep !== set.repRange.maxrep ? set.repRange.minrep : undefined;
                if (minrep != null) {
                  isWithRepRanges = true;
                }
                const programSet: IProgramSet = {
                  minRepsExpr: minrep ? `${minrep}` : undefined,
                  repsExpr: `${set.repRange.maxrep}`,
                  weightExpr: `state.weight * ${multiplier}`,
                  isAmrap: !!set.repRange?.isAmrap,
                };
                programSets.push(programSet);
              }
            }
          }
        }
        const schema = programSets
          .reduce<string[]>((memo, programSet) => {
            let set = `${
              programSet.minRepsExpr ? `${programSet.minRepsExpr}-${programSet.repsExpr}` : programSet.repsExpr
            }`;
            set += `:${programSet.weightExpr}`;
            if (programSet.isAmrap) {
              set += `+`;
            }
            return [...memo, set];
          }, [])
          .join("/");

        const exid = `${exercise.id}_${exercise.equipment}`;
        intermediateSets[exid] = intermediateSets[exid] || {};
        intermediateSets[exid][schema] = intermediateSets[exid][schema] || {
          encounters: [],
          sets: [],
          schema,
          exercise,
        };
        intermediateSets[exid][schema].encounters.push({
          day: item.day,
          week: item.week,
          dayInWeek: item.dayInWeek,
        });
        intermediateSets[exid][schema].schema = schema;
        intermediateSets[exid][schema].sets = programSets;
      }
    }

    const exerciseNamesToIds: Record<string, string> = {};

    const programExercises: IProgramExercise[] = Object.keys(intermediateSets).map((key) => {
      const variationsData = ObjectUtils.values(intermediateSets[key]);
      const exercise = variationsData[0].exercise;
      const conditions: Record<number, IDayData[]> = {};
      const variations: IProgramExerciseVariation[] = variationsData.map((v, i) => {
        conditions[i] = v.encounters;
        return {
          sets: v.sets,
        };
      });
      const weeksAndDays = ObjectUtils.values(conditions).reduce<Record<number, number[]>>((memo, v) => {
        for (const dayData of v) {
          const week = dayData.week!;
          memo[week] = memo[week] || [];
          memo[week].push(dayData.dayInWeek!);
        }
        return memo;
      }, {});
      console.log(key);
      console.log(weeksAndDays);
      let variationExpr = ObjectUtils.keys(conditions).reduce((acc, index) => {
        const cond = conditions[index];
        const groupByWeek = cond.reduce<Record<number, number[]>>((memo, c) => {
          memo[c.week!] = memo[c.week!] || [];
          memo[c.week!].push(c.dayInWeek!);
          return memo;
        }, {});
        console.log(groupByWeek);
        const expr = ObjectUtils.keys(groupByWeek).reduce<string[]>((memo, week) => {
          const days = groupByWeek[week];
          const daysInWeek = weeksAndDays[week];
          const useDayInWeek = daysInWeek.length > 1;
          if (days.length === 1) {
            if (useDayInWeek) {
              memo.push(`(week == ${Number(week) + 1} && dayInWeek == ${Number(days[0]) + 1})`);
            } else {
              memo.push(`(week == ${Number(week) + 1})`);
            }
          } else {
            memo.push(
              `(week == ${Number(week) + 1} && (${days.map((d) => `dayInWeek == ${Number(d) + 1}`).join(" || ")}))`
            );
          }
          return memo;
        }, []);
        return acc + `${expr.join(" || ")} ? ${Number(index) + 1} :\n`;
      }, "");
      variationExpr += ` 1`;
      const id = UidFactory.generateUid(8);
      exerciseNamesToIds[exercise.name] = id;
      const programExercise: IProgramExercise = {
        id,
        name: exercise.name,
        variationExpr,
        variations,
        finishDayExpr: "",
        exerciseType: exercise,
        state: { weight: exercise.startingWeightLb },
        descriptions: [],
      };
      return programExercise;
    });

    const weeks: IProgramWeek[] = [];
    const days: IProgramDay[] = [];
    for (const key of Object.keys(exercisesToWeeksDays)) {
      const value = exercisesToWeeksDays[key];
      const id = UidFactory.generateUid(8);
      const dayInWeeks = Array.from(new Set(value.dayData.map((d) => d.dayInWeek)));
      const day: IProgramDay = {
        id,
        name: `Day ${dayInWeeks.map((d) => d + 1).join("/")}`,
        exercises: value.exercises.map((e) => ({ id: exerciseNamesToIds[e] })),
      };
      days.push(day);
      for (const dayData of value.dayData) {
        let week: IProgramWeek | undefined = weeks[dayData.week];
        if (week == null) {
          week = {
            id: UidFactory.generateUid(8),
            name: `Week ${dayData.week + 1}`,
            days: [],
          };
          weeks[dayData.week] = week;
        }
        week.days[dayData.dayInWeek] = { id: day.id };
      }
    }

    const program: IProgram = {
      id: UidFactory.generateUid(8),
      name: "My Program",
      description: "Generated from a Workout Planner",
      url: "",
      author: "",
      nextDay: 1,
      exercises: programExercises,
      days: days,
      weeks: weeks,
      isMultiweek: true,
      tags: [],
    };

    return program;
  }

  export function switchToUnit(program: IProgram, settings: ISettings): IProgram {
    return { ...program, exercises: program.exercises.map((ex) => ProgramExercise.switchToUnit(ex, settings)) };
  }
}
