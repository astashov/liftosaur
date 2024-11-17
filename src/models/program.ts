import { Exercise, exercises, warmupValues } from "./exercise";
import { ScriptRunner } from "../parser";
import { IScriptBindings, Progress } from "./progress";
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
  IProgramExerciseWarmupSet,
  IUnit,
  IProgramWeek,
  IDayData,
  IExerciseData,
} from "../types";
import { ObjectUtils } from "../utils/object";
import { Exporter } from "../utils/exporter";
import { DateUtils } from "../utils/date";
import { ICustomExercise, IProgramContentSettings, IAllCustomExercises, IPlannerProgram, IPercentage } from "../types";
import { ProgramExercise } from "./programExercise";
import { Thunk } from "../ducks/thunks";
import { getLatestMigrationVersion } from "../migrations/migrations";
import { Encoder } from "../utils/encoder";
import { CollectionUtils } from "../utils/collection";
import { StringUtils } from "../utils/string";
import { ILiftoscriptVariableValue, ILiftoscriptEvaluatorUpdate } from "../liftoscriptEvaluator";
import { ProgramToPlanner } from "./programToPlanner";
import { MathUtils } from "../utils/math";
import { PlannerToProgram } from "./plannerToProgram";
import { IPlannerState, IExportedPlannerProgram } from "../pages/planner/models/types";
import { PlannerKey } from "../pages/planner/plannerKey";
import memoize from "micro-memoize";
import { Equipment } from "./equipment";
import { showAlert } from "../lib/alert";
import { PlannerProgram } from "../pages/planner/models/plannerProgram";

declare let __HOST__: string;

export interface IExportedProgram {
  program: IProgram;
  customExercises: Partial<Record<string, ICustomExercise>>;
  version: string;
  settings: IProgramContentSettings;
}

export type IProgramMode = "planner" | "regular" | "update";
export const emptyProgramId = "emptyprogram";

export namespace Program {
  export function getProgram(state: IState, id?: string): IProgram | undefined {
    if (id === emptyProgramId) {
      return createEmptyProgram();
    } else {
      return state.storage.programs.find((p) => p.id === id);
    }
  }

  export function getFullProgram(state: IState, id?: string): IProgram | undefined {
    const program = getProgram(state, id);
    if (program) {
      return fullProgram(program, state.storage.settings);
    } else {
      return undefined;
    }
  }

  export const fullProgram = memoize(
    (program: IProgram, settings: ISettings): IProgram => {
      if (program.planner != null) {
        try {
          const newProgram = new PlannerToProgram(
            program.id,
            program.nextDay,
            program.planner,
            settings
          ).convertToProgram();
          return {
            ...newProgram,
            url: program.url,
            author: program.author,
            tags: program.tags,
            description: program.description,
          };
        } catch (error) {
          const e = error as Error;
          if (typeof window !== "undefined" && window.alert != null) {
            window.alert(
              `There's an error executing your program code. Go to 'Program' in the footer to fix it.\n\n${e.message}`
            );
          }
          return program;
        }
      } else {
        return program;
      }
    },
    { maxSize: 10 }
  );

  export function cleanPlannerProgram(program: IProgram): IProgram {
    if (program.planner != null) {
      return {
        ...program,
        exercises: [],
        days: [],
        weeks: [],
        deletedDays: [],
        deletedWeeks: [],
        deletedExercises: [],
      };
    } else {
      return program;
    }
  }

  export function getEditingProgram(state: IState): IProgram | undefined {
    return state.storage.programs.find((p) => p.id === state.editProgram?.id);
  }

  export function getProgramExercise(program: IProgram, id: string): IProgramExercise | undefined {
    return program.exercises.find((p) => p.id === id);
  }

  export function getProgramExercisesFromExerciseType(
    program: IProgram,
    exerciseType: IExerciseType
  ): IProgramExercise[] {
    return program.exercises.filter((p) => Exercise.eq(p.exerciseType, exerciseType));
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
      program: Program.cleanPlannerProgram(program),
      customExercises: settings.exercises,
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
      programExercise,
      allProgramExercises,
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
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[],
    dayData: IDayData,
    programSets: IProgramSet[],
    state: IProgramState,
    settings: ISettings,
    enabledRpe: boolean,
    enabledRepRanges: boolean,
    warmupSets?: IProgramExerciseWarmupSet[],
    shouldFallback?: boolean
  ): IHistoryEntry {
    const exercise = programExercise.exerciseType;
    const sets: ISet[] = programSets.map((set) => {
      const repsValue = ScriptRunner.safe(
        () => {
          return new ScriptRunner(
            set.repsExpr,
            state,
            {},
            Progress.createEmptyScriptBindings(dayData, settings, exercise),
            Progress.createScriptFunctions(settings),
            settings.units,
            { exerciseType: exercise, unit: settings.units },
            "regular"
          ).execute("reps");
        },
        (e) => {
          return `There's an error while calculating reps for the next workout for '${exercise.id}' exercise:\n\n${e.message}.\n\nWe fallback to a default 5 reps. Please fix the program's reps script.`;
        },
        5,
        !shouldFallback
      );
      const unit = Equipment.getUnitOrDefaultForExerciseType(settings, exercise);
      const weightValue = ScriptRunner.safe(
        () => {
          let weight = new ScriptRunner(
            set.weightExpr,
            state,
            {},
            Progress.createEmptyScriptBindings(dayData, settings, exercise),
            Progress.createScriptFunctions(settings),
            unit,
            { exerciseType: exercise, unit: unit },
            "regular"
          ).execute("weight");
          if (Weight.isPct(weight)) {
            weight = Weight.convertTo(
              Weight.multiply(Exercise.onerm(exercise, settings), MathUtils.roundFloat(weight.value / 100, 4)),
              unit
            );
          }
          return weight;
        },
        (e) => {
          return `There's an error while calculating weight for the next workout for '${exercise.id}' exercise:\n\n${e.message}.\n\nWe fallback to a default 100${settings.units}. Please fix the program's weight script.`;
        },
        Weight.build(100, unit),
        !shouldFallback
      );
      const roundedWeight = Weight.roundConvertTo(weightValue, settings, unit, exercise);
      const rpeExpr = set.rpeExpr;
      const rpeValue =
        enabledRpe && rpeExpr?.trim()
          ? ScriptRunner.safe(
              () => {
                return new ScriptRunner(
                  rpeExpr,
                  state,
                  {},
                  Progress.createEmptyScriptBindings(dayData, settings, exercise),
                  Progress.createScriptFunctions(settings),
                  settings.units,
                  { exerciseType: exercise, unit: settings.units },
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
                  {},
                  Progress.createEmptyScriptBindings(dayData, settings, exercise),
                  Progress.createScriptFunctions(settings),
                  settings.units,
                  { exerciseType: exercise, unit: settings.units },
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
      const timerExpr = set.timerExpr?.trim();
      const timer = timerExpr
        ? ScriptRunner.safe(
            () =>
              new ScriptRunner(
                `${timerExpr}`.trim(),
                state,
                {},
                Progress.createEmptyScriptBindings(dayData, settings, exercise),
                Progress.createScriptFunctions(settings),
                settings.units,
                {
                  exerciseType: exercise,
                  unit: settings.units,
                },
                "regular"
              ).execute("timer"),
            (e) => {
              return `There's an error while calculating timer for the next workout for '${exercise.id}' exercise:\n\n${e.message}.\n\nWe fallback to a default timer. Please fix the program's timer script.`;
            },
            undefined,
            false
          )
        : undefined;
      return {
        isAmrap: set.isAmrap,
        label: set.label,
        reps: repsValue,
        minReps: minRepsValue,
        rpe: rpeValue,
        timer: timer,
        logRpe: set.logRpe,
        askWeight: set.askWeight,
        weight: roundedWeight,
        originalWeight: weightValue,
      };
    });

    const entry = {
      exercise: exercise,
      programExerciseId: programExercise.id,
      sets,
      warmupSets: sets[0]?.weight != null ? Exercise.getWarmupSets(exercise, sets[0].weight, settings, warmupSets) : [],
    };
    const newEntry = Progress.runUpdateScriptForEntry(
      entry,
      dayData,
      programExercise,
      allProgramExercises,
      -1,
      settings
    );
    return newEntry;
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

  export function stateValue(
    state: IProgramState,
    key: string,
    value?: string
  ): number | IWeight | IPercentage | undefined {
    if (value == null) {
      return undefined;
    }
    const numValue = parseFloat(value);
    const oldValue = state[key];
    if (oldValue == null) {
      return numValue;
    } else if (Weight.is(oldValue)) {
      return Weight.build(numValue, oldValue.unit);
    } else if (Weight.isPct(oldValue)) {
      return Weight.buildPct(numValue);
    } else {
      return numValue;
    }
  }

  export function nextProgramRecord(
    program: IProgram,
    settings: ISettings,
    dayIndex?: number,
    staticStates?: Partial<Record<string, IProgramState>>
  ): IHistoryRecord {
    const day = Math.max(1, Math.min(numberOfDays(program, settings), Math.max(1, (dayIndex || program.nextDay) ?? 0)));
    program = fullProgram(program, settings);
    const programDay = getProgramDay(program, day);
    const week = getWeekFromDay(program, day);
    const dayInWeek = getDayInWeek(program, day);
    const dayData: IDayData = {
      day,
      week,
      dayInWeek,
    };

    const dayNameParts: string[] = [];
    if (program.isMultiweek && program.weeks.length > 1) {
      dayNameParts.push(program.weeks[week - 1]?.name ?? "");
    }
    if (program.days.length > 1) {
      dayNameParts.push(programDay.name);
    }
    const dayName = dayNameParts.join(" - ");
    const now = Date.now();
    return {
      id: 0,
      date: new Date().toISOString(),
      programId: program.id,
      programName: program.name,
      intervals: [],
      day,
      week,
      dayInWeek,
      dayName,
      startTime: now,
      updatedAt: now,
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
    let variationIndex: number;
    if (!variationIndexResult.success) {
      showAlert(
        `There's an error while calculating variation index for the next workout for '${programExercise.name}' exercise:\n\n${variationIndexResult.error}.\n\nWe fallback to the first variation index. Please fix the program exercise set variation script.`,
        10000
      );
      variationIndex = 1;
    } else {
      variationIndex = variationIndexResult.data;
    }
    const variations = ProgramExercise.getVariations(programExercise, allProgramExercises);
    return Math.floor(Math.max(0, Math.min(variationIndex - 1, variations.length - 1)));
  }

  export function parseExerciseFinishDayScript(
    dayData: IDayData,
    settings: ISettings,
    state: IProgramState,
    script: string,
    exerciseType?: IExerciseType
  ): IEither<unknown, string> {
    const scriptRunner = new ScriptRunner(
      script,
      state,
      {},
      Progress.createEmptyScriptBindings(dayData, settings),
      Progress.createScriptFunctions(settings),
      settings.units,
      { exerciseType, unit: settings.units },
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

  export function programMode(program?: IProgram): IProgramMode {
    return program?.planner != null ? "planner" : "regular";
  }

  export function getOtherStates(allProgramExercises: IProgramExercise[]): Record<number, IProgramState> {
    return allProgramExercises.reduce<Record<number, IProgramState>>((acc, e) => {
      const tags = e.tags || [];
      for (const tag of tags) {
        acc[tag] = ObjectUtils.clone(ProgramExercise.getState(e, allProgramExercises));
      }
      return acc;
    }, {});
  }

  export function runExerciseFinishDayScript(
    entry: IHistoryEntry,
    dayData: IDayData,
    settings: ISettings,
    state: IProgramState,
    programExercise: IProgramExercise,
    program: IProgram,
    mode: IProgramMode,
    staticState?: IProgramState
  ): IEither<{ state: IProgramState; bindings: IScriptBindings; updates: ILiftoscriptEvaluatorUpdate[] }, string> {
    const allProgramExercises = program.exercises;
    const script = ProgramExercise.getFinishDayScript(programExercise, allProgramExercises);
    const setVariationIndexResult = Program.runVariationScript(
      programExercise,
      allProgramExercises,
      state,
      dayData,
      settings
    );
    const descriptionIndexResult = Program.runDescriptionScript(
      programExercise.descriptionExpr ?? "1",
      programExercise.exerciseType,
      state,
      dayData,
      settings
    );
    let setVariationIndex = setVariationIndexResult.success ? setVariationIndexResult.data : 1;
    const descriptionIndex = descriptionIndexResult.success ? descriptionIndexResult.data : 1;

    if (mode === "planner" && program.planner != null) {
      setVariationIndex = calculatePlannerSetVariationIndex(
        programExercise,
        program.planner,
        settings,
        setVariationIndex
      );
    }

    const bindings = Progress.createScriptBindings(
      dayData,
      entry,
      settings,
      undefined,
      setVariationIndex,
      descriptionIndex
    );
    const fns = Progress.createScriptFunctions(settings);
    const newState = { ...state, ...staticState };
    let updates: ILiftoscriptEvaluatorUpdate[] = [];
    const otherStates = getOtherStates(allProgramExercises);

    try {
      const runner = new ScriptRunner(
        script,
        newState,
        otherStates,
        bindings,
        fns,
        settings.units,
        { exerciseType: entry.exercise, unit: settings.units },
        mode
      );
      runner.execute();
      updates = runner.getUpdates();
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

    return { success: true, data: { state: newState, updates, bindings } };
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
          {},
          Progress.createEmptyScriptBindings(dayData, settings, exercise),
          Progress.createScriptFunctions(settings),
          settings.units,
          { exerciseType: exercise, unit: settings.units },
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
              {},
              Progress.createEmptyScriptBindings(dayData, settings, programExercise.exerciseType),
              Progress.createScriptFunctions(settings),
              settings.units,
              { exerciseType: programExercise.exerciseType, unit: settings.units },
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
          {},
          Progress.createEmptyScriptBindings(dayData, settings, programExercise.exerciseType),
          Progress.createScriptFunctions(settings),
          settings.units,
          { exerciseType: programExercise.exerciseType, unit: settings.units },
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

  export function calculatePlannerSetVariationIndex(
    programExercise: IProgramExercise,
    planner: IPlannerProgram,
    settings: ISettings,
    setVariationIndex: number
  ): number {
    let dayIndex = 0;
    const key = PlannerKey.fromProgramExercise(programExercise, settings);
    const variationIndexes = ProgramToPlanner.variationsMap(planner, settings)?.[key];
    if (variationIndexes != null) {
      for (let weekIndex = 0; weekIndex < planner.weeks.length; weekIndex++) {
        for (let dayInWeekIndex = 0; dayInWeekIndex < planner.weeks[weekIndex].days.length; dayInWeekIndex++) {
          const result = variationIndexes[dayIndex];
          if (result != null) {
            const [start, end] = variationIndexes[dayIndex];
            if (setVariationIndex >= start && setVariationIndex <= end) {
              setVariationIndex = setVariationIndex - start;
              return setVariationIndex;
            }
          }
          dayIndex += 1;
        }
      }
    }
    return setVariationIndex;
  }

  export function runFinishDayScript(
    programExercise: IProgramExercise,
    program: IProgram,
    dayData: IDayData,
    entry: IHistoryEntry,
    settings: ISettings,
    mode: IProgramMode,
    userPromptedStateVars?: IProgramState,
    staticState?: IProgramState
  ): IEither<
    {
      state: IProgramState;
      otherStates: Record<number, IProgramState>;
      updates?: ILiftoscriptEvaluatorUpdate[];
      bindings: IScriptBindings;
    },
    string
  > {
    const allProgramExercises = program.exercises;
    const state = ProgramExercise.getState(programExercise, allProgramExercises);
    const setVariationIndexResult = Program.runVariationScript(
      programExercise,
      allProgramExercises,
      state,
      dayData,
      settings
    );
    const descriptionIndexResult = Program.runDescriptionScript(
      programExercise.descriptionExpr ?? "1",
      programExercise.exerciseType,
      state,
      dayData,
      settings
    );
    let setVariationIndex = setVariationIndexResult.success ? setVariationIndexResult.data : 1;
    const descriptionIndex = descriptionIndexResult.success ? descriptionIndexResult.data : 1;

    if (mode === "planner" && program.planner != null) {
      setVariationIndex = calculatePlannerSetVariationIndex(
        programExercise,
        program.planner,
        settings,
        setVariationIndex
      );
    }

    const bindings = Progress.createScriptBindings(
      dayData,
      entry,
      settings,
      undefined,
      setVariationIndex,
      descriptionIndex
    );
    const fns = Progress.createScriptFunctions(settings);

    const newState: IProgramState = {
      ...state,
      ...userPromptedStateVars,
      ...staticState,
    };
    const initialOtherStates = getOtherStates(allProgramExercises);
    const otherStates = ObjectUtils.clone(initialOtherStates);

    let updates: ILiftoscriptEvaluatorUpdate[] = [];
    try {
      const runner = new ScriptRunner(
        ProgramExercise.getFinishDayScript(programExercise, allProgramExercises),
        newState,
        otherStates,
        bindings,
        fns,
        settings.units,
        { exerciseType: programExercise.exerciseType, unit: settings.units },
        mode
      );
      runner.execute();
      updates = runner.getUpdates();
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

    const diffOtherStates = ObjectUtils.keys(otherStates).reduce<Record<number, IProgramState>>((memo, key) => {
      if (!ObjectUtils.isEqual(otherStates[key], initialOtherStates[key])) {
        const diffState = ObjectUtils.keys(otherStates[key]).reduce<IProgramState>((memo2, key2) => {
          if (!Weight.eq(otherStates[key][key2], initialOtherStates[key][key2])) {
            memo2[key2] = otherStates[key][key2];
          }
          return memo2;
        }, {});
        memo[key] = diffState;
      }
      return memo;
    }, {});

    return { success: true, data: { state: newState, otherStates: diffOtherStates, updates, bindings } };
  }

  export function dayAverageTimeMs(program: IProgram, settings: ISettings): number {
    const dayApproxTimes = program.days.map((d, i) => {
      const dayData = Program.getDayData(program, i + 1, settings);
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
    staticStates?: Partial<Record<string, IProgramState>>,
    retry?: boolean
  ): { program: IProgram; exerciseData: IExerciseData } {
    program = Program.fullProgram(program, settings);
    const exerciseData: IExerciseData = {};
    const setVariationIndexMap: Record<string, ILiftoscriptVariableValue<number>[]> = {};
    const descriptionIndexMap: Record<string, ILiftoscriptVariableValue<number>[]> = {};
    const dayData = Progress.getDayData(progress);
    let newProgram = ObjectUtils.clone(program);
    for (const e of newProgram.exercises) {
      const entry = progress.entries.filter((ent) => ent.programExerciseId === e.id)[0];
      if (entry != null && entry.sets.some((s) => s.completedReps != null)) {
        const staticState = (staticStates || {})[e.id];
        const newStateResult = Program.runFinishDayScript(
          e,
          program,
          dayData,
          entry,
          settings,
          Program.programMode(program),
          progress.userPromptedStateVars?.[e.id],
          staticState
        );
        if (newStateResult.success) {
          const { state, updates, bindings, otherStates } = newStateResult.data;
          const exerciseKey = Exercise.toKey(entry.exercise);
          const onerm = Exercise.onerm(e, settings);
          if (!Weight.eq(bindings.rm1, onerm)) {
            exerciseData[exerciseKey] = { rm1: Weight.roundTo005(bindings.rm1) };
          }
          const reuseLogicId = e.reuseLogic?.selected;

          if (Program.programMode(program) === "planner" && updates != null) {
            ProgramExercise.applyVariables(
              dayData,
              e,
              program.planner!,
              updates,
              settings,
              setVariationIndexMap,
              descriptionIndexMap
            );
          }
          if (reuseLogicId && e.reuseLogic) {
            e.reuseLogic.states[reuseLogicId] = state;
          } else {
            e.state = state;
          }
          for (const key of ObjectUtils.keys(otherStates || {})) {
            const matchingExercises = newProgram.exercises.filter((ex) => ex.tags?.includes(Number(key)));
            for (const ex of matchingExercises) {
              const newState = { ...ex.state, ...otherStates[key] };
              ex.state = newState;
            }
          }
        } else {
          alert(
            `There's an error while executing Finish Day Script of '${e.name}' exercise:\n\n${newStateResult.error}.\n\nState Variables won't be updated for that exercise. Please fix the program's Finish Day Script.`
          );
        }
      }
    }

    const theNextDay = Program.nextDay(newProgram, settings, progress.day);
    const planner = newProgram.planner;
    if (planner) {
      try {
        newProgram.planner = new ProgramToPlanner(
          newProgram,
          planner,
          settings,
          setVariationIndexMap,
          descriptionIndexMap
        ).convertToPlanner();
        newProgram = Program.cleanPlannerProgram(newProgram);
      } catch (e) {
        if (retry) {
          throw e;
        }
        const reProgram = new PlannerToProgram(program.id, program.nextDay, planner, settings).convertToProgram();
        return runAllFinishDayScripts(reProgram, progress, settings, staticStates, true);
      }
    }

    return {
      program: lf(newProgram).p("nextDay").set(theNextDay),
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

  export function createEmptyProgram(): IProgram {
    return {
      exercises: [],
      id: emptyProgramId,
      name: "Ad-Hoc Workout",
      description: "",
      url: "",
      author: "",
      nextDay: 1,
      days: [{ exercises: [], id: "emptyworkoutday", name: "Day 1" }],
      weeks: [],
      isMultiweek: false,
      tags: [],
    };
  }

  export function cloneProgram(dispatch: IDispatch, program: IProgram, settings: ISettings): void {
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("programs")
        .recordModify((programs) => {
          const newProgram = { ...program, clonedAt: Date.now() };
          if (newProgram.planner) {
            newProgram.planner = PlannerProgram.switchToUnit(newProgram.planner, settings);
          }
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

  export function numberOfDays(program: IProgram, settings: ISettings): number {
    program = fullProgram(program, settings);
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

  export function getDayData(program: IProgram, day: number, settings: ISettings): IDayData {
    program = fullProgram(program, settings);
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

  export function getDayName(program: IProgram, day: number, settings: ISettings): string {
    const dayData = getDayData(program, day, settings);
    const programDay = getProgramDay(program, day);
    const week = program.weeks[(dayData.week || 1) - 1];
    const isMultiweek = program.isMultiweek && program.weeks.length > 1 && week != null;
    return `${isMultiweek ? `${week.name} - ` : ""}${programDay.name}`;
  }

  export function getListOfDays(program: IProgram, settings: ISettings): [string, string][] {
    program = fullProgram(program, settings);
    if (program.isMultiweek) {
      const result: [string, string][] = [];
      let dayIndex = 1;
      const isReallyMultiweek = program.weeks.length > 1;
      for (const week of program.weeks) {
        for (const day of week.days) {
          const programDay = program.days.find((d) => d.id === day.id);
          if (programDay) {
            result.push([`${dayIndex}`, `${isReallyMultiweek ? `${week.name} - ` : ""}${programDay.name}`]);
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
      const dayId = program.weeks[weekIndex]?.days[dayIndex]?.id;
      const programDay = program.days.find((pd) => pd.id === dayId) || program.days[0] || createDay("Day 1");
      return programDay;
    } else {
      return program.days[d];
    }
  }

  export function nextDay(program: IProgram, settings: ISettings, day?: number): number {
    const nd = (day != null ? day % numberOfDays(program, settings) : 0) + 1;
    return isNaN(nd) ? 1 : nd;
  }

  export function editAction(dispatch: IDispatch, id: string, plannerState?: IPlannerState): void {
    updateState(dispatch, [
      lb<IState>().p("editProgram").record({ id }),
      lb<IState>().p("editProgramV2").record(plannerState),
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

  export function exportProgram(program: IProgram, settings: ISettings, version?: string): IExportedProgram {
    const aFullProgram = Program.fullProgram(program, settings);
    const customExerciseIds = aFullProgram.exercises.reduce<string[]>((memo, programExercise) => {
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
      settings: ObjectUtils.pick(settings, ["units", "timers", "planner"]),
    };
  }

  export function exportedPlannerProgramToExportedProgram(
    exportedPlannerProgram: IExportedPlannerProgram,
    aNextDay?: number
  ): IExportedProgram {
    const program = {
      ...Program.create(exportedPlannerProgram.program.name, exportedPlannerProgram.id),
      planner: exportedPlannerProgram.program,
    };
    if (aNextDay != null) {
      program.nextDay = aNextDay;
    }
    const exportedProgram: IExportedProgram = {
      customExercises: exportedPlannerProgram.settings.exercises,
      program,
      version: exportedPlannerProgram.version,
      settings: {
        timers: {
          workout: exportedPlannerProgram.settings.timer,
        },
        planner: exportedPlannerProgram.plannerSettings,
      },
    };
    return exportedProgram;
  }

  export function switchToUnit(program: IProgram, settings: ISettings): IProgram {
    return { ...program, exercises: program.exercises.map((ex) => ProgramExercise.switchToUnit(ex, settings)) };
  }

  export function filterCustomExercises(program: IProgram, customExercises: IAllCustomExercises): IAllCustomExercises {
    return ObjectUtils.filter(customExercises, (id) => {
      return program.exercises.some((pe) => pe.exerciseType.id === id);
    });
  }

  export function create(name: string, id?: string): IProgram {
    return {
      id: id || UidFactory.generateUid(8),
      name: name,
      url: "",
      author: "",
      shortDescription: "",
      description: "",
      nextDay: 1,
      weeks: [],
      isMultiweek: false,
      days: [{ id: UidFactory.generateUid(8), name: "Day 1", exercises: [] }],
      exercises: [],
      tags: [],
      deletedDays: [],
      deletedWeeks: [],
      deletedExercises: [],
      clonedAt: Date.now(),
    };
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
      days: newProgram.planner
        ? newProgram.days
        : CollectionUtils.concatBy(oldProgram.days, newProgram.days, (p) => p.id)
            .map((d) => ({ ...d, exercises: d.exercises.filter((e) => !deletedExercises.has(e.id)) }))
            .filter((d) => !deletedDays.has(d.id)),
      deletedDays: Array.from(deletedDays),
      weeks: newProgram.planner
        ? newProgram.weeks
        : CollectionUtils.concatBy(oldProgram.weeks, newProgram.weeks, (p) => p.id)
            .map((d) => ({ ...d, days: d.days.filter((e) => !deletedDays.has(e.id)) }))
            .filter((d) => !deletedWeeks.has(d.id)),
      deletedWeeks: Array.from(deletedWeeks),
      isMultiweek: newProgram.isMultiweek,
      tags: newProgram.tags,
      shortDescription: newProgram.shortDescription,
      exercises: newProgram.planner
        ? newProgram.exercises
        : CollectionUtils.concatBy(
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
      planner: newProgram.planner,
    };
  }
}
