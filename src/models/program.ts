import {
  allExercisesList,
  warmupValues,
  Exercise_eq,
  Exercise_getIsUnilateral,
  Exercise_getWarmupSets,
  Exercise_toKey,
  Exercise_onerm,
  Exercise_findById,
  Exercise_get,
  Exercise_fullName,
} from "./exercise";
import { ScriptRunner } from "../parser";
import {
  IScriptBindings,
  Progress_getEntryId,
  Progress_runUpdateScriptForEntry,
  Progress_createScriptBindings,
  Progress_createScriptFunctions,
  Progress_getDayData,
} from "./progress";
import { lb } from "lens-shmens";
import { IDispatch } from "../ducks/types";
import { IEither } from "../utils/types";
import { Weight_is, Weight_build, Weight_isPct, Weight_buildPct, Weight_eq, Weight_roundTo005 } from "./weight";
import { UidFactory_generateUid } from "../utils/generator";
import { IState, updateState } from "./state";
import {
  IProgram,
  IStorage,
  IProgramExercise,
  ISettings,
  IHistoryEntry,
  IExerciseType,
  IProgramState,
  ISet,
  IHistoryRecord,
  IWeight,
  IProgramExerciseVariation,
  IUnit,
  IDayData,
  IExerciseData,
  IStats,
  IShortDayData,
} from "../types";
import {
  ObjectUtils_omit,
  ObjectUtils_clone,
  ObjectUtils_diff,
  ObjectUtils_keys,
  ObjectUtils_isEqual,
  ObjectUtils_pick,
  ObjectUtils_diffPaths,
} from "../utils/object";
import { Exporter_toFile } from "../utils/exporter";
import { DateUtils_formatYYYYMMDD } from "../utils/date";
import { ICustomExercise, IProgramContentSettings, IPlannerProgram, IPercentage } from "../types";
import { ProgramExercise_approxTimeMs, ProgramExercise_applyVariables } from "./programExercise";
import { Thunk_pushScreen } from "../ducks/thunks";
import { getLatestMigrationVersion } from "../migrations/migrations";
import { Encoder } from "../utils/encoder";
import { StringUtils_pluralize, StringUtils_hashString } from "../utils/string";
import { ILiftoscriptEvaluatorUpdate } from "../liftoscriptEvaluator";
import { ProgramToPlanner } from "./programToPlanner";
import {
  IExportedPlannerProgram,
  IPlannerProgramExercise,
  IPlannerProgramExerciseWithType,
} from "../pages/planner/models/types";
import memoize from "micro-memoize";
import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import { PlannerEvaluator, IByExercise, IByTag } from "../pages/planner/plannerEvaluator";
import { PP } from "./pp";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import { CollectionUtils_sortBy, CollectionUtils_uniqBy } from "../utils/collection";
import { PlannerSyntaxError } from "../pages/planner/plannerExerciseEvaluator";
import { UrlUtils } from "../utils/url";
import { Service } from "../api/service";
import { EditProgram_initPlannerState } from "./editProgram";
import { ProgramSet_getEvaluatedWeight } from "./programSet";
import { Stats_getCurrentMovingAverageBodyweight } from "./stats";

declare let __HOST__: string;

const encodedProgramHashToShortUrl: Partial<Record<string, string>> = {};

export interface IProgramIndexEntry {
  id: string;
  name: string;
  author: string;
  authorUrl: string;
  url: string;
  shortDescription: string;
  description?: string;
  isMultiweek: boolean;
  tags: string[];
  frequency?: number;
  age?: string;
  duration?: string;
  goal?: string;
  exercises?: IExerciseType[];
  equipment?: string[];
  exercisesRange?: [number, number];
  weeksCount?: number;
  datePublished?: string;
  dateModified?: string;
}

export interface IExportedProgram {
  program: IProgram;
  customExercises: Partial<Record<string, ICustomExercise>>;
  version: string;
  settings: IProgramContentSettings;
}

export interface IEvaluatedProgramWeek {
  name: string;
  description?: string;
  days: IEvaluatedProgramDay[];
}

export interface IEvaluatedProgramDay {
  name: string;
  dayData: Required<IDayData>;
  description?: string;
  exercises: IPlannerProgramExercise[];
}

export interface IEvaluatedProgramError {
  error: PlannerSyntaxError;
  dayData: Required<IDayData>;
}

export interface IEvaluatedProgram {
  type: "evaluatedProgram";
  id: string;
  planner: IPlannerProgram;
  name: string;
  nextDay: number;
  errors: IEvaluatedProgramError[];
  weeks: IEvaluatedProgramWeek[];
  states: IByTag<IProgramState>;
}
export type IEProgram = IProgram | IEvaluatedProgram;

export type IProgramMode = "planner" | "update";
export const emptyProgramId = "emptyprogram";

function isEvaluatedProgram(program: IEProgram): program is IEvaluatedProgram {
  return "type" in program && program.type === "evaluatedProgram";
}

export function ev(program: IEProgram, settings: ISettings): IEvaluatedProgram {
  if (isEvaluatedProgram(program)) {
    return program;
  } else {
    return Program_evaluate(program, settings);
  }
}

export function Program_getProgram(state: IState, id?: string): IProgram | undefined {
  if (id === emptyProgramId) {
    return Program_createEmptyProgram();
  } else {
    return state.storage.programs.find((p) => p.id === id);
  }
}

export function Program_getFullProgram(state: IState, id?: string): IProgram | undefined {
  const program = Program_getProgram(state, id);
  if (program) {
    return Program_fullProgram(program, state.storage.settings);
  } else {
    return undefined;
  }
}

export function Program_cleanPlannerProgram(program: IProgram): IProgram {
  const planner = program.planner;
  if (planner != null) {
    const newPlanner = {
      ...planner,
      weeks: planner.weeks.map((w) => ({
        ...ObjectUtils_omit(w, ["id"]),
        days: w.days.map((d) => ({
          ...ObjectUtils_omit(d, ["id"]),
        })),
      })),
    };
    return {
      ...program,
      planner: newPlanner,
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

export function Program_isEmpty(program?: IProgram | IEvaluatedProgram): boolean {
  return program?.id === emptyProgramId;
}

export function Program_getProgramExercisesFromExerciseType(
  program: IEvaluatedProgram,
  exerciseType: IExerciseType
): IPlannerProgramExercise[] {
  return Program_getAllUsedProgramExercises(program).filter((p) => Exercise_eq(p.exerciseType, exerciseType));
}

export function Program_getProgramIndex(state: IState, id: string): number {
  return state.storage.programs.findIndex((p) => p.id === id);
}

export function Program_getCurrentProgram(storage: IStorage): IProgram | undefined {
  return storage.programs.filter((p) => p.id === storage.currentProgramId)[0];
}

export function Program_storageToExportedProgram(storage: IStorage, programId: string): IExportedProgram | undefined {
  const program = storage.programs.find((p) => p.id === programId);
  if (!program) {
    return undefined;
  }
  const settings = storage.settings;
  return {
    program: Program_cleanPlannerProgram(program),
    customExercises: settings.exercises,
    version: storage.version,
    settings: settings,
  };
}

export function Program_nextHistoryEntry(
  program: IEvaluatedProgram,
  dayData: IDayData,
  index: number,
  programExercise: IPlannerProgramExerciseWithType,
  stats: IStats,
  settings: ISettings
): IHistoryEntry {
  const exercise = programExercise.exerciseType;
  const programSets = PlannerProgramExercise.currentEvaluatedSetVariation(programExercise)?.sets;
  const warmupSets = PlannerProgramExercise.programWarmups(programExercise, settings);
  const sets: ISet[] = [];
  for (let i = 0; i < programSets.length; i++) {
    const programSet = programSets[i];
    const minReps =
      programSet.minrep != null && programSet.minrep !== programSet.maxrep ? programSet.minrep : undefined;
    const weight = ProgramSet_getEvaluatedWeight(programSet, programExercise.exerciseType, settings);
    sets.push({
      vtype: "set",
      id: UidFactory_generateUid(6),
      reps: programSet.maxrep,
      index: i,
      minReps,
      weight,
      isUnilateral: Exercise_getIsUnilateral(exercise, settings),
      rpe: programSet.rpe,
      timer: programSet.timer,
      logRpe: programSet.logRpe,
      askWeight: programSet.askWeight,
      originalWeight: programSet.weight,
      isAmrap: programSet.isAmrap,
      label: programSet.label,
      isCompleted: false,
      programSetIndex: i,
    });
  }

  const entry: IHistoryEntry = {
    vtype: "history_entry",
    id: Progress_getEntryId(exercise, programExercise.label),
    index,
    exercise: exercise,
    programExerciseId: programExercise.key,
    sets,
    superset: programExercise.superset?.name,
    warmupSets: Exercise_getWarmupSets(exercise, sets[0]?.weight, settings, warmupSets),
  };
  const newEntry = Progress_runUpdateScriptForEntry(
    entry,
    dayData,
    programExercise,
    program.states,
    -1,
    settings,
    stats
  );
  return newEntry;
}

export function Program_stateValue(
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
  } else if (Weight_is(oldValue)) {
    return Weight_build(numValue, oldValue.unit);
  } else if (Weight_isPct(oldValue)) {
    return Weight_buildPct(numValue);
  } else {
    return numValue;
  }
}

export function Program_nextHistoryRecord(
  aProgram: IProgram,
  settings: ISettings,
  stats: IStats,
  dayIndex?: number
): IHistoryRecord {
  const program = Program_evaluate(aProgram, settings);
  return Program_nextHistoryRecordFromEvaluated(program, settings, stats, dayIndex);
}

export function Program_nextHistoryRecordFromEvaluated(
  program: IEvaluatedProgram,
  settings: ISettings,
  stats: IStats,
  dayIndex?: number
): IHistoryRecord {
  const day = Math.max(1, Math.min(Program_numberOfDays(program), Math.max(1, (dayIndex || program.nextDay) ?? 0)));
  const dayData = Program_getDayData(program, day);
  const { week, dayInWeek } = dayData;

  const fullDayName = Program_getDayName(program, day);
  const now = Date.now();
  const programDay = Program_getProgramDay(program, day);
  const dayExercises = programDay ? Program_getProgramDayUsedExercises(programDay) : [];
  const sortedDayExercises = CollectionUtils_sortBy(dayExercises, "order");
  const entries = sortedDayExercises.map((exercise, i) => {
    return Program_nextHistoryEntry(program, dayData, i, exercise, stats, settings);
  });
  return {
    vtype: "progress",
    id: 0,
    date: new Date().toISOString(),
    programId: program.id,
    programName: program.name,
    intervals: [],
    day,
    week,
    dayInWeek,
    dayName: fullDayName,
    startTime: now,
    updatedAt: now,
    entries,
    ui: {},
  };
}

export function Program_getSupersetGroups(
  evaluatedProgram: IEvaluatedProgram,
  dayData: IShortDayData,
  excludeExercise?: IPlannerProgramExercise
): Partial<Record<string, IPlannerProgramExerciseWithType[]>> {
  const programDay = Program_getProgramDay(
    evaluatedProgram,
    Program_getDayNumber(evaluatedProgram, dayData.week, dayData.dayInWeek)
  );
  const dayExercises = programDay ? Program_getProgramDayUsedExercises(programDay) : [];
  const groups: Partial<Record<string, IPlannerProgramExerciseWithType[]>> = {};
  for (const exercise of dayExercises) {
    if (exercise.superset != null) {
      if (!groups[exercise.superset.name]) {
        groups[exercise.superset.name] = [];
      }
      if (exercise.key !== excludeExercise?.key) {
        groups[exercise.superset.name]!.push(exercise);
      }
    }
  }
  return groups;
}

export function Program_getSupersetExercises(
  evalutedProgram: IEvaluatedProgram,
  plannerExercise: IPlannerProgramExercise
): IPlannerProgramExerciseWithType[] {
  if (plannerExercise.superset == null) {
    return [];
  }
  const dayData = plannerExercise.dayData;
  const programDay = Program_getProgramDay(evalutedProgram, dayData.day);
  const dayExercises = programDay ? Program_getProgramDayUsedExercises(programDay) : [];
  const result = dayExercises.filter((e) => e.superset?.name === plannerExercise.superset?.name);
  return result;
}

export function Program_runExerciseFinishDayScript(
  entry: IHistoryEntry,
  dayData: IDayData,
  settings: ISettings,
  state: IProgramState,
  otherStates: IByExercise<IProgramState>,
  programExercise: IPlannerProgramExercise,
  stats: IStats,
  userPromptedStateVars?: IProgramState
): IEither<
  {
    state: IProgramState;
    bindings: IScriptBindings;
    updates: ILiftoscriptEvaluatorUpdate[];
    prints: [number | IPercentage | IWeight][];
  },
  string
> {
  const script = PlannerProgramExercise.getProgressScript(programExercise) || "";
  const setVariationIndex = PlannerProgramExercise.currentEvaluatedSetVariationIndex(programExercise);
  const descriptionIndex = PlannerProgramExercise.currentDescriptionIndex(programExercise);

  const bindings = Progress_createScriptBindings(
    dayData,
    entry,
    settings,
    programExercise.evaluatedSetVariations[setVariationIndex]?.sets.length ?? 0,
    Stats_getCurrentMovingAverageBodyweight(stats, settings),
    undefined,
    setVariationIndex + 1,
    descriptionIndex + 1
  );
  const fns = Progress_createScriptFunctions(settings);
  let updates: ILiftoscriptEvaluatorUpdate[] = [];
  const newState: IProgramState = ObjectUtils_clone({ ...state, ...userPromptedStateVars });

  const fnContext = { exerciseType: entry.exercise, unit: settings.units, prints: [] };
  try {
    const runner = new ScriptRunner(
      script,
      newState,
      ObjectUtils_clone(otherStates),
      bindings,
      fns,
      settings.units,
      fnContext,
      "planner"
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

  const stateDiff = { ...entry.state, ...ObjectUtils_diff(state, newState) };
  return { success: true, data: { state: stateDiff, updates, bindings, prints: fnContext.prints } };
}

export function Program_runFinishDayScript(
  programExercise: IPlannerProgramExercise,
  program: IEvaluatedProgram,
  dayData: IDayData,
  entry: IHistoryEntry,
  settings: ISettings,
  stats: IStats,
  userPromptedStateVars?: IProgramState
): IEither<
  {
    state: IProgramState;
    otherStates: Record<number, IProgramState>;
    updates: ILiftoscriptEvaluatorUpdate[];
    bindings: IScriptBindings;
  },
  string
> {
  const state = PlannerProgramExercise.getState(programExercise);
  const setVariationIndex = PlannerProgramExercise.currentEvaluatedSetVariationIndex(programExercise);
  const descriptionIndex = PlannerProgramExercise.currentDescriptionIndex(programExercise);
  const bindings = Progress_createScriptBindings(
    dayData,
    entry,
    settings,
    programExercise.evaluatedSetVariations[setVariationIndex]?.sets.length ?? 0,
    Stats_getCurrentMovingAverageBodyweight(stats, settings),
    undefined,
    setVariationIndex + 1,
    descriptionIndex + 1
  );
  const fns = Progress_createScriptFunctions(settings);

  const newState: IProgramState = {
    ...state,
    ...userPromptedStateVars,
  };
  const otherStates = ObjectUtils_clone(program.states);

  const script = PlannerProgramExercise.getProgressScript(programExercise) || "";
  let updates: ILiftoscriptEvaluatorUpdate[] = [];
  try {
    const runner = new ScriptRunner(
      script,
      newState,
      otherStates,
      bindings,
      fns,
      settings.units,
      { exerciseType: programExercise.exerciseType, unit: settings.units, prints: [] },
      "planner"
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

  const diffOtherStates = ObjectUtils_keys(otherStates).reduce<IByTag<IProgramState>>((memo, key) => {
    if (!ObjectUtils_isEqual(otherStates[key], program.states[key])) {
      const diffState = ObjectUtils_keys(otherStates[key]).reduce<IProgramState>((memo2, key2) => {
        if (!Weight_eq(otherStates[key][key2], program.states[key][key2])) {
          memo2[key2] = otherStates[key][key2];
        }
        return memo2;
      }, {});
      memo[key] = diffState;
    }
    return memo;
  }, {});

  const stateDiff = ObjectUtils_diff(state, newState);
  return { success: true, data: { state: stateDiff, otherStates: diffOtherStates, updates, bindings } };
}

export function Program_dayAverageTimeMs(program: IEvaluatedProgram, settings: ISettings): number {
  const dayApproxTimes: number[] = [];
  for (const week of program.weeks) {
    for (const day of week.days) {
      dayApproxTimes.push(Program_dayApproxTimeMs(day, settings));
    }
  }
  return dayApproxTimes.reduce((acc, t) => acc + t, 0) / dayApproxTimes.length;
}

export function Program_dayApproxTimeMs(programDay: IEvaluatedProgramDay, settings: ISettings): number {
  return Program_getProgramDayUsedExercises(programDay).reduce((acc, e) => {
    return acc + ProgramExercise_approxTimeMs(e, settings);
  }, 0);
}

export function Program_getProgramExerciseForKeyAndShortDayData(
  program: IEvaluatedProgram,
  dayData: IShortDayData,
  key: string
): IPlannerProgramExerciseWithType | undefined {
  const day = Program_getDayNumber(program, dayData.week, dayData.dayInWeek);
  return Program_getProgramExerciseForKeyAndDay(program, day, key);
}

export function Program_getProgramExerciseForKeyAndDay(
  program: IEvaluatedProgram,
  day: number,
  key: string
): IPlannerProgramExerciseWithType | undefined {
  const programDay = program ? Program_getProgramDay(program, day) : undefined;
  const dayExercises = programDay ? Program_getProgramDayUsedExercises(programDay) : [];
  let programExercise = dayExercises.find((pe) => pe.key === key);
  if (programExercise == null) {
    const allExercises = program ? Program_getAllProgramExercisesWithType(program) : [];
    programExercise = allExercises.find((pe) => pe.key === key);
    if (programExercise != null) {
      programExercise = { ...programExercise, dayData: Program_getDayData(program, day) };
    }
  }
  return programExercise;
}

export function Program_runAllFinishDayScripts(
  program: IProgram,
  progress: IHistoryRecord,
  stats: IStats,
  settings: ISettings
): { program: IProgram; exerciseData: IExerciseData } {
  const exerciseData: IExerciseData = {};
  const newEvaluatedProgram = Program_forceEvaluate(program, settings);
  const dayData = Progress_getDayData(progress);
  const programDay = Program_getProgramDay(newEvaluatedProgram, progress.day);
  if (!programDay) {
    return { program, exerciseData };
  }
  for (const entry of progress.entries) {
    if (entry != null && !entry.isSuppressed && entry.sets.some((s) => s.isCompleted)) {
      const programExercise =
        program && entry.programExerciseId
          ? Program_getProgramExerciseForKeyAndDay(newEvaluatedProgram, dayData.day, entry.programExerciseId)
          : undefined;
      if (programExercise) {
        const newStateResult = Program_runFinishDayScript(
          programExercise,
          newEvaluatedProgram,
          dayData,
          entry,
          settings,
          stats,
          progress.userPromptedStateVars?.[programExercise.key]
        );
        if (newStateResult.success) {
          const { state, updates, bindings, otherStates } = newStateResult.data;
          const exerciseKey = Exercise_toKey(entry.exercise);
          const onerm = Exercise_onerm(entry.exercise, settings);
          if (!Weight_eq(bindings.rm1, onerm)) {
            exerciseData[exerciseKey] = { rm1: Weight_roundTo005(bindings.rm1) };
          }
          PP.iterate2(newEvaluatedProgram.weeks, (exercise) => {
            if (exercise.key === programExercise.key && exercise.progress) {
              exercise.progress.state = { ...exercise.progress.state, ...entry.state, ...state };
            }
          });
          ProgramExercise_applyVariables(programExercise.key, newEvaluatedProgram, updates, settings);
          for (const key of ObjectUtils_keys(otherStates || {})) {
            PP.iterate2(newEvaluatedProgram.weeks, (exercise) => {
              if (exercise.tags?.includes(Number(key)) && exercise.progress) {
                exercise.progress.state = { ...exercise.progress.state, ...otherStates[key] };
              }
            });
          }
        } else {
          alert(`There was an error executing progress script: ${newStateResult.error}`);
        }
      }
    }
  }
  const theNextDay = Program_nextDay(newEvaluatedProgram, progress.day);
  const newPlanner = new ProgramToPlanner(newEvaluatedProgram, settings).convertToPlanner();
  const newProgram = ObjectUtils_clone(program);
  newProgram.nextDay = theNextDay;
  newProgram.planner = newPlanner;

  return {
    program: newProgram,
    exerciseData,
  };
}

export function Program_createVariation(useStateWeight?: boolean): IProgramExerciseVariation {
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

export function Program_createExercise(units: IUnit): IProgramExercise {
  const defaultWarmup = warmupValues(units)[45];
  return {
    name: "Squat",
    id: UidFactory_generateUid(8),
    variations: [Program_createVariation(true)],
    exerciseType: {
      id: "squat",
      equipment: "barbell",
    },
    state: {
      weight: units === "kg" ? allExercisesList.squat.startingWeightKg : allExercisesList.squat.startingWeightLb,
    },
    warmupSets: defaultWarmup,
    finishDayExpr: "",
    variationExpr: "1",
    descriptions: [""],
    stateMetadata: {},
    reuseLogic: { selected: undefined, states: {} },
  };
}

export function Program_previewProgram(dispatch: IDispatch, programId: string, showCustomPrograms: boolean): void {
  updateState(
    dispatch,
    [
      lb<IState>().p("previewProgram").record({
        id: programId,
        showCustomPrograms,
      }),
    ],
    "Preview program"
  );
  dispatch(Thunk_pushScreen("programPreview"));
}

export function Program_createEmptyProgram(): IProgram {
  return {
    vtype: "program",
    exercises: [],
    id: emptyProgramId,
    name: "Ad-Hoc Workout",
    description: "",
    url: "",
    author: "",
    nextDay: 1,
    days: [],
    weeks: [],
    isMultiweek: false,
    planner: {
      vtype: "planner",
      name: "Ad-Hoc Workout",
      weeks: [{ name: "", days: [{ name: "", exerciseText: "" }] }],
    },
    tags: [],
  };
}

export function Program_cloneProgram(dispatch: IDispatch, program: IProgram, settings: ISettings): void {
  const newProgramId = UidFactory_generateUid(8);
  updateState(
    dispatch,
    [
      lb<IState>()
        .p("storage")
        .p("programs")
        .recordModify((programs) => {
          const newProgram = { ...program, clonedAt: Date.now(), id: newProgramId };
          if (newProgram.planner) {
            newProgram.planner = PlannerProgram.switchToUnit(newProgram.planner, settings);
          }
          return [...programs, newProgram];
        }),
      lb<IState>().p("storage").p("currentProgramId").record(newProgramId),
    ],
    "Clone program"
  );
}

export function Program_selectProgram(dispatch: IDispatch, programId: string): void {
  updateState(dispatch, [lb<IState>().p("storage").p("currentProgramId").record(programId)], "Select program");
  dispatch(Thunk_pushScreen("main", undefined, true));
}

export function Program_getAllProgramExercises(evaluatedProgram: IEvaluatedProgram): IPlannerProgramExercise[] {
  return evaluatedProgram.weeks.flatMap((w) => w.days.flatMap((d) => d.exercises));
}

export function Program_getAllUsedProgramExercises(
  evaluatedProgram: IEvaluatedProgram
): IPlannerProgramExerciseWithType[] {
  const used = Program_getAllProgramExercises(evaluatedProgram).filter((e) => !e.notused && e.exerciseType != null);
  return used as IPlannerProgramExerciseWithType[];
}

export function Program_getAllProgramExercisesWithType(
  evaluatedProgram: IEvaluatedProgram
): IPlannerProgramExerciseWithType[] {
  const used = Program_getAllProgramExercises(evaluatedProgram).filter((e) => e.exerciseType != null);
  return used as IPlannerProgramExerciseWithType[];
}

export function Program_getProgramExerciseByTypeWeekAndDay(
  evaluatedProgram: IEvaluatedProgram,
  exerciseType: IExerciseType,
  week: number,
  dayInWeek: number
): IPlannerProgramExercise | undefined {
  let exercise: IPlannerProgramExercise | undefined;
  PP.iterate2(evaluatedProgram.weeks, (e, weekIndex, dayInWeekIndex) => {
    if (
      weekIndex + 1 === week &&
      dayInWeekIndex + 1 === dayInWeek &&
      e.exerciseType &&
      Exercise_eq(e.exerciseType, exerciseType)
    ) {
      exercise = e;
      return true;
    }
    return false;
  });
  return exercise;
}

export function Program_forceEvaluate(program: IProgram, settings: ISettings): IEvaluatedProgram {
  const planner = program.planner;
  if (!planner) {
    return {
      type: "evaluatedProgram",
      id: program.id,
      planner: {
        vtype: "planner",
        name: program.name,
        weeks: [{ name: "Week 1", days: [{ name: "Day 1", exerciseText: "" }] }],
      },
      name: program.name,
      errors: [],
      nextDay: program.nextDay,
      weeks: [
        {
          name: "Week 1",
          days: [
            {
              name: "Day 1",
              dayData: { day: 1, week: 1, dayInWeek: 1 },
              exercises: [],
            },
          ],
        },
      ],
      states: {},
    };
  }
  const { evaluatedWeeks } = PlannerEvaluator.forceEvaluate(program.planner!, settings);
  let dayNum = 0;
  const errors: IEvaluatedProgramError[] = [];
  const weeks = planner.weeks.map((week, weekIndex) => {
    const evaluatedWeek = evaluatedWeeks[weekIndex];
    const days = week.days.map((day, dayInWeekIndex) => {
      dayNum += 1;
      const evaluatedDay = evaluatedWeek[dayInWeekIndex];
      const dayData = {
        day: dayNum,
        week: weekIndex + 1,
        dayInWeek: dayInWeekIndex + 1,
      };
      const evaluatedExercises = CollectionUtils_sortBy(evaluatedDay.success ? evaluatedDay.data : [], "order");
      if (!evaluatedDay.success) {
        errors.push({ error: evaluatedDay.error, dayData });
      }
      return {
        name: day.name,
        description: day.description,
        dayData,
        exercises: evaluatedExercises,
      };
    });
    return { name: week.name, description: week.description, days };
  });
  const states: IByTag<IProgramState> = {};
  PP.iterate(evaluatedWeeks, (exercise) => {
    for (const tag of exercise.tags) {
      states[tag] = { ...states[tag], ...PlannerProgramExercise.getState(exercise) };
    }
  });
  const result: IEvaluatedProgram = {
    type: "evaluatedProgram",
    id: program.id,
    errors,
    planner,
    name: program.name,
    nextDay: program.nextDay,
    weeks: weeks,
    states,
  };
  // console.log("Program text", PlannerProgram.generateFullText(program.planner?.weeks || []));
  return result;
}

export function Program_getNumberOfExerciseInstances(program: IEvaluatedProgram, exerciseKey: string): number {
  let count = 0;
  PP.iterate2(program.weeks, (exercise) => {
    if (exercise.key === exerciseKey) {
      count += 1;
    }
  });
  return count;
}

export function Program_changeExerciseName(from: string, to: string, program: IProgram, settings: ISettings): IProgram {
  const planner = program.planner;
  if (!planner) {
    return program;
  }
  return {
    ...program,
    planner: {
      ...planner,
      weeks: planner.weeks.map((week) => {
        return {
          ...week,
          days: week.days.map((day) => {
            return {
              ...day,
              exerciseText: PlannerEvaluator.changeExerciseName(day.exerciseText, from, to, settings),
            };
          }),
        };
      }),
    },
  };
}

export function Program_numberOfDays(program: IEvaluatedProgram): number {
  return program.weeks.reduce((memo, week) => memo + week.days.length, 0);
}

export function Program_weeksRange(program: IEvaluatedProgram): string | undefined {
  return program.weeks.length > 1
    ? `${program.weeks.length} ${StringUtils_pluralize("week", program.weeks.length)}`
    : "";
}

export function Program_daysRange(program: IEvaluatedProgram): string {
  const minDays = Math.min(...program.weeks.map((w) => w.days.length));
  const maxDays = Math.max(...program.weeks.map((w) => w.days.length));
  if (minDays === maxDays) {
    return `${minDays} ${StringUtils_pluralize("day", minDays)} per week`;
  } else {
    return `${minDays}-${maxDays} days per week`;
  }
}

export function Program_exerciseRange(program: IEvaluatedProgram): string {
  const days = program.weeks.flatMap((w) => w.days);
  const minExs = Math.min(...days.map((d) => Program_getProgramDayUsedExercises(d).length));
  const maxExs = Math.max(...days.map((d) => Program_getProgramDayUsedExercises(d).length));
  return Program_exerciseRangeFormat(minExs, maxExs);
}

export function Program_exerciseRangeFormat(minExs: number, maxExs: number): string {
  if (minExs === maxExs) {
    return `${minExs} ${StringUtils_pluralize("exercise", minExs)} per day`;
  } else {
    return `${minExs}-${maxExs} exercises per day`;
  }
}

export function Program_getWeekFromDay(program: IEvaluatedProgram, day: number): number {
  let daysTotal = 0;
  for (let i = 0; i < program.weeks.length; i += 1) {
    const weekDays = program.weeks[i].days.length;
    daysTotal += weekDays;
    if (daysTotal >= day) {
      return i + 1;
    }
  }
  return 1;
}

export function Program_getDayNumber(
  program: IPlannerProgram | IEvaluatedProgram,
  week: number,
  dayInWeek: number
): number {
  let dayIndex = 1;
  for (let w = 0; w < program.weeks.length; w += 1) {
    for (let d = 0; d < program.weeks[w].days.length; d += 1) {
      if (w === week - 1 && d === dayInWeek - 1) {
        return dayIndex;
      }
      dayIndex += 1;
    }
  }
  return -1;
}

export function Program_getExerciseTypesForWeekDay(
  program: IEvaluatedProgram,
  week: number,
  day: number
): IExerciseType[] {
  const exerciseTypes: IExerciseType[] = [];
  PP.iterate2(program.weeks, (exercise, weekIndex, dayInWeekIndex) => {
    if (weekIndex + 1 === week && dayInWeekIndex + 1 === day) {
      const exType = exercise.exerciseType;
      if (exType && !exerciseTypes.some((et) => Exercise_eq(et, exType))) {
        exerciseTypes.push(exType);
      }
    }
  });
  return exerciseTypes;
}

export function Program_getDayData(program: IEvaluatedProgram, day: number): Required<IDayData> {
  return {
    day,
    week: Program_getWeekFromDay(program, day),
    dayInWeek: Program_getDayInWeek(program, day),
  };
}

export function Program_getDayInWeek(program: IEvaluatedProgram, day: number): number {
  let daysTotal = 0;
  for (const week of program.weeks) {
    daysTotal += week.days.length;
    if (daysTotal >= day) {
      return day - (daysTotal - week.days.length);
    }
  }
  return 1;
}

export function Program_getDayName(program: IEvaluatedProgram, day: number): string {
  const dayData = Program_getDayData(program, day);
  const programDay = Program_getProgramDay(program, day);
  const week = program.weeks[(dayData.week || 1) - 1];
  const isMultiweek = program.weeks.length > 1 && week != null;
  return `${isMultiweek ? `${week.name} - ` : ""}${programDay?.name}`;
}

export function Program_getListOfDays(program: IEvaluatedProgram): [string, string][] {
  const days: [string, string][] = [];
  const isReallyMultiweek = program.weeks.length > 1;
  let dayIndex = 0;
  for (const week of program.weeks) {
    for (const day of week.days) {
      dayIndex += 1;
      days.push([`${dayIndex}`, `${isReallyMultiweek ? `${week.name} - ` : ""}${day.name}`]);
    }
  }
  return days;
}

export function Program_getProgramWeek(program: IEvaluatedProgram, day?: number): IEvaluatedProgramWeek {
  return program.weeks[Program_getWeekFromDay(program, day || 1) - 1] || program.weeks[0];
}

export function Program_getProgramDay(program: IEvaluatedProgram, day: number): IEvaluatedProgramDay | undefined {
  let aDay = 0;
  for (const week of program.weeks || []) {
    for (const d of week.days) {
      aDay += 1;
      if (day === aDay) {
        return d;
      }
    }
  }
  return undefined;
}

export function Program_getProgramDayExercises(programDay: IEvaluatedProgramDay): IPlannerProgramExerciseWithType[] {
  const list = programDay.exercises.filter((e) => e.exerciseType != null);
  return list as IPlannerProgramExerciseWithType[];
}

export function Program_getProgramDayUsedExercises(
  programDay: IEvaluatedProgramDay
): IPlannerProgramExerciseWithType[] {
  const list = programDay.exercises.filter((e) => !e.notused && e.exerciseType != null);
  return list as IPlannerProgramExerciseWithType[];
}

export function Program_applyEvaluatedProgram(
  program: IProgram,
  evaluatedProgram: IEvaluatedProgram,
  settings: ISettings
): IProgram {
  const newProgram = ObjectUtils_clone(program);
  newProgram.planner = new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner();
  newProgram.nextDay = evaluatedProgram.nextDay;
  return newProgram;
}

export function Program_getProgramExercise(
  day: number,
  program?: IEvaluatedProgram,
  key?: string
): IPlannerProgramExercise | undefined {
  if (key == null || program == null) {
    return undefined;
  }
  const programDay = Program_getProgramDay(program, day);
  return programDay?.exercises.find((e) => e.key === key);
}

export function Program_getFirstProgramExercise(
  program?: IEvaluatedProgram,
  key?: string
): IPlannerProgramExercise | undefined {
  if (key == null || program == null) {
    return undefined;
  }
  return Program_getAllProgramExercises(program).find((e) => e.key === key || e.fullName === key);
}

export function Program_getProgramExerciseFromDay(
  programDay?: IEvaluatedProgramDay,
  key?: string
): IPlannerProgramExercise | undefined {
  if (key == null || programDay == null) {
    return undefined;
  }
  return programDay?.exercises.find((e) => e.key === key);
}

export function Program_getEvaluatedExercise(
  program: IProgram,
  day: number,
  key: string,
  settings: ISettings
): IPlannerProgramExercise | undefined {
  const { weeks: evaluatedWeeks } = Program_evaluate(program, settings);
  let plannerProgramExercise: IPlannerProgramExercise | undefined;
  PP.iterate2(evaluatedWeeks, (exercise, weekIndex, dayInWeekIndex, dayIndex) => {
    if (dayIndex === day - 1 && exercise.key === key) {
      plannerProgramExercise = exercise;
      return true;
    } else {
      return undefined;
    }
  });
  return plannerProgramExercise;
}

export function Program_nextDay(program: IEvaluatedProgram, day?: number): number {
  const nd = (day != null ? day % Program_numberOfDays(program) : 0) + 1;
  return isNaN(nd) ? 1 : nd;
}

export function Program_editAction(
  dispatch: IDispatch,
  program: IProgram,
  dayData?: IDayData,
  key?: string,
  resetStack?: boolean
): void {
  const plannerState = EditProgram_initPlannerState(program.id, program, dayData, key);
  dispatch(Thunk_pushScreen("editProgram", { plannerState }, resetStack));
}

export function Program_exportProgramToFile(program: IProgram, settings: ISettings, version: string): void {
  const payload = Program_exportProgram(program, settings, version);
  Exporter_toFile(
    `liftosaur_${program.name.replace(/\s+/g, "-")}_${DateUtils_formatYYYYMMDD(Date.now())}.json`,
    JSON.stringify(payload, null, 2)
  );
}

export async function Program_exportProgramToLink(
  program: IProgram,
  settings: ISettings,
  version: string
): Promise<string> {
  const payload = Program_exportProgram(program, settings, version);
  const url = await Encoder.encodeIntoUrl(JSON.stringify(payload), __HOST__);
  url.pathname = "/program";
  return url.toString();
}

export function Program_exportProgram(program: IProgram, settings: ISettings, version?: string): IExportedProgram {
  const aFullProgram = Program_evaluate(program, settings);
  const customExerciseIds = Program_getAllProgramExercises(aFullProgram).reduce<string[]>((memo, programExercise) => {
    const id = programExercise.exerciseType?.id;
    if (id) {
      const isBuiltIn = !!Exercise_findById(id, {});
      if (!isBuiltIn) {
        memo.push(id);
      }
    }
    return memo;
  }, []);

  const customExercises = ObjectUtils_pick(settings.exercises, customExerciseIds);
  return {
    customExercises,
    program,
    version: version || getLatestMigrationVersion(),
    settings: ObjectUtils_pick(settings, ["units", "timers", "planner"]),
  };
}

export function Program_exportedPlannerProgramToExportedProgram(
  exportedPlannerProgram: IExportedPlannerProgram,
  aNextDay?: number
): IExportedProgram {
  const program = {
    ...Program_create(exportedPlannerProgram.program.name, exportedPlannerProgram.id),
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

export function Program_create(name: string, id?: string): IProgram {
  return {
    vtype: "program" as const,
    id: id || UidFactory_generateUid(8),
    name: name,
    url: "",
    author: "",
    shortDescription: "",
    description: "",
    nextDay: 1,
    weeks: [],
    isMultiweek: false,
    days: [{ id: UidFactory_generateUid(8), name: "Day 1", exercises: [] }],
    exercises: [],
    tags: [],
    deletedDays: [],
    deletedWeeks: [],
    deletedExercises: [],
    clonedAt: Date.now(),
  };
}

export function Program_isChanged(aProgram: IProgram, bProgram: IProgram): boolean {
  const { ...cleanedAProgram } = aProgram;
  const { ...cleanedBProgram } = bProgram;
  const changed = !ObjectUtils_isEqual(cleanedAProgram, cleanedBProgram);
  if (changed) {
    const paths = ObjectUtils_diffPaths(cleanedAProgram, cleanedBProgram);
    return paths.some((p) => {
      return !p.match(/exercises.\d+.state/) && !p.match(/exercises.\d+.reuseLogic\.states/) && !p.match(/nextDay/);
    });
  }
  return false;
}

export function Program_mergePrograms(
  oldProgram: IProgram,
  newProgram: IProgram,
  enforceNew: boolean = false
): IProgram {
  const deletedWeeks = new Set([...(oldProgram.deletedWeeks || []), ...(newProgram.deletedWeeks || [])]);
  const deletedDays = new Set([...(oldProgram.deletedDays || []), ...(newProgram.deletedDays || [])]);
  const deletedExercises = new Set([...(oldProgram.deletedExercises || []), ...(newProgram.deletedExercises || [])]);
  return {
    vtype: "program",
    id: newProgram.id,
    name: newProgram.name,
    description: newProgram.description,
    url: newProgram.url,
    author: newProgram.author,
    nextDay: newProgram.nextDay,
    days: newProgram.days,
    deletedDays: Array.from(deletedDays),
    weeks: newProgram.weeks,
    deletedWeeks: Array.from(deletedWeeks),
    isMultiweek: newProgram.isMultiweek,
    tags: newProgram.tags,
    shortDescription: newProgram.shortDescription,
    exercises: newProgram.exercises,
    deletedExercises: Array.from(deletedExercises),
    clonedAt: newProgram.clonedAt || oldProgram.clonedAt,
    planner: newProgram.planner,
  };
}

export async function Program_toUrl(
  program: IProgram,
  settings: ISettings,
  client: Window["fetch"],
  userId?: string
): Promise<string> {
  const exportedProgram = Program_exportProgram(program, settings);
  const baseUrl = UrlUtils.build(
    "/planner",
    typeof window !== "undefined" ? window.location.href : "https://www.liftosaur.com"
  );
  const json = JSON.stringify(exportedProgram);
  const hash = StringUtils_hashString(json);
  const encodedUrl = await Encoder.encodeIntoUrl(json, baseUrl.toString());
  const encodedProgramUrl = encodedUrl.toString();
  if (encodedProgramHashToShortUrl[hash]) {
    return encodedProgramHashToShortUrl[hash];
  } else {
    const service = new Service(client);
    const shortUrl = await service.postShortUrl(encodedProgramUrl, "p", settings.affiliateEnabled ? userId : undefined);
    encodedProgramHashToShortUrl[hash] = shortUrl;
    return shortUrl;
  }
}

export function Program_createFromHistoryRecord(
  programName: string,
  record: IHistoryRecord,
  settings: ISettings
): IProgram {
  const dayData = { week: 1, day: 1, dayInWeek: 1 };
  const program: IProgram = {
    ...Program_create(programName),
    planner: {
      vtype: "planner",
      name: programName,
      weeks: [{ name: "Week 1", days: [{ name: "Day 1", exerciseText: "" }] }],
    },
  };
  const evaluatedProgram = Program_evaluate(program, settings);
  const planner = program.planner!;
  planner.weeks[0].days[0].exerciseText = record.entries
    .map((entry) => {
      const exercise = Exercise_get(entry.exercise, settings.exercises);
      return Exercise_fullName(exercise, settings);
    })
    .join("\n");
  const newDay: IEvaluatedProgramDay = {
    dayData: dayData,
    name: "Day 1",
    exercises: record.entries.map((e, i) => {
      return PlannerProgramExercise.createExerciseFromEntry(e, dayData, settings, i);
    }),
  };
  evaluatedProgram.weeks[0].days[0] = newDay;
  const newPlanner = new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner();
  const newProgram = {
    ...ObjectUtils_clone(program),
    planner: newPlanner,
  };
  return newProgram;
}

export function Program_addDayFromHistoryRecord(
  program: IProgram,
  afterDay: number,
  record: IHistoryRecord,
  settings: ISettings
): { program: IProgram; dayData: Required<IDayData> } {
  const evaluatedProgram = Program_evaluate(program, settings);
  const dayData = Program_getDayData(evaluatedProgram, afterDay);
  const newDayData = { week: dayData.week, day: dayData.day + 1, dayInWeek: dayData.dayInWeek + 1 };
  const newDay: IEvaluatedProgramDay = {
    dayData: newDayData,
    name: `Day ${dayData.day + 1}`,
    exercises: record.entries.map((e, i) => {
      return PlannerProgramExercise.createExerciseFromEntry(e, newDayData, settings, i);
    }),
  };
  evaluatedProgram.weeks[dayData.week - 1].days.splice(dayData.dayInWeek, 0, newDay);
  evaluatedProgram.planner.weeks[dayData.week - 1].days.splice(dayData.dayInWeek, 0, {
    name: newDay.name,
    exerciseText: newDay.exercises.map((e) => e.fullName).join("\n"),
  });
  const newPlanner = new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner();
  const newProgram = {
    ...ObjectUtils_clone(program),
    planner: newPlanner,
  };
  return { program: newProgram, dayData: newDayData };
}

export function Program_getReusingSetsExercises(
  evaluatedProgram: IEvaluatedProgram,
  programExercise: IPlannerProgramExercise
): IPlannerProgramExercise[] {
  const exercises: IPlannerProgramExercise[] = [];
  PP.iterate2(evaluatedProgram.weeks, (e) => {
    if (
      e.reuse?.exercise?.key === programExercise.key &&
      e.reuse?.exercise.dayData.week === programExercise.dayData.week &&
      e.reuse?.exercise.dayData.dayInWeek === programExercise.dayData.dayInWeek
    ) {
      exercises.push(e);
    }
  });
  return exercises;
}

export function Program_getReusingDescriptionsExercises(
  evaluatedProgram: IEvaluatedProgram,
  programExercise: IPlannerProgramExercise
): IPlannerProgramExercise[] {
  const exercises: IPlannerProgramExercise[] = [];
  PP.iterate2(evaluatedProgram.weeks, (e) => {
    if (
      e.descriptions.reuse?.exercise?.key === programExercise.key &&
      e.descriptions.reuse?.exercise.dayData.week === programExercise.dayData.week &&
      e.descriptions.reuse?.exercise.dayData.dayInWeek === programExercise.dayData.dayInWeek
    ) {
      exercises.push(e);
    }
  });
  return exercises;
}

export function Program_getReusingCustomProgressExercises(
  evaluatedProgram: IEvaluatedProgram,
  programExercise: IPlannerProgramExercise
): IPlannerProgramExercise[] {
  const exercises: IPlannerProgramExercise[] = [];
  PP.iterate2(evaluatedProgram.weeks, (e) => {
    if (e.progress?.type === "custom" && e.progress?.reuse?.fullName === programExercise.fullName) {
      exercises.push(e);
    }
  });
  return exercises;
}

export function Program_getReusingSetProgressExercises(
  evaluatedProgram: IEvaluatedProgram,
  programExercise: IPlannerProgramExercise
): IPlannerProgramExercise[] {
  const exercises: IPlannerProgramExercise[] = [];
  PP.iterate2(evaluatedProgram.weeks, (e) => {
    if (e.reuse?.fullName === programExercise.fullName && e.progress) {
      exercises.push(e);
    }
  });
  return exercises;
}

export function Program_getReusingProgressExercises(
  evaluatedProgram: IEvaluatedProgram,
  programExercise: IPlannerProgramExercise
): IPlannerProgramExercise[] {
  const reusingCustomProgressExercises = Program_getReusingCustomProgressExercises(evaluatedProgram, programExercise);
  const reusingSetProgressExercises = Program_getReusingSetProgressExercises(evaluatedProgram, programExercise);
  const exercises = CollectionUtils_uniqBy(
    [...reusingCustomProgressExercises, ...reusingSetProgressExercises],
    "fullName"
  );
  return exercises;
}

export function Program_getReusingUpdateExercises(
  evaluatedProgram: IEvaluatedProgram,
  programExercise: IPlannerProgramExercise
): IPlannerProgramExercise[] {
  const exercises: IPlannerProgramExercise[] = [];
  PP.iterate2(evaluatedProgram.weeks, (e) => {
    if (e.reuse?.fullName === programExercise.fullName) {
      exercises.push(e);
    }
  });
  return exercises;
}

export const Program_fullProgram = memoize(
  (program: IProgram, settings: ISettings): IProgram => {
    return program;
  },
  { maxSize: 10 }
);

export const Program_evaluate = memoize(Program_forceEvaluate, { maxSize: 10 });
