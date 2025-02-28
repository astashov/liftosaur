import { Exercise, exercises, warmupValues } from "./exercise";
import { ScriptRunner } from "../parser";
import { IScriptBindings, Progress } from "./progress";
import { Screen } from "./screen";
import { lb } from "lens-shmens";
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
import { ILiftoscriptEvaluatorUpdate } from "../liftoscriptEvaluator";
import { ProgramToPlanner } from "./programToPlanner";
import { IPlannerState, IExportedPlannerProgram, IPlannerProgramExercise } from "../pages/planner/models/types";
import memoize from "micro-memoize";
import { Equipment } from "./equipment";
import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import { PlannerEvaluator, IByExercise, IByTag } from "../pages/planner/plannerEvaluator";
import { PP } from "./pp";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";

declare let __HOST__: string;

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

export interface IEvaluatedProgram {
  id: string;
  planner: IPlannerProgram;
  name: string;
  nextDay: number;
  weeks: IEvaluatedProgramWeek[];
  states: IByTag<IProgramState>;
}

export type IProgramMode = "planner" | "update";
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
      return program;
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

  export function nextHistoryEntry(
    program: IEvaluatedProgram,
    dayData: IDayData,
    programExercise: IPlannerProgramExercise,
    settings: ISettings
  ): IHistoryEntry {
    const exercise = programExercise.exerciseType;
    const programSets =
      programExercise.evaluatedSetVariations[PlannerProgramExercise.currentSetVariationIndex(programExercise)]?.sets;
    const warmupSets = PlannerProgramExercise.programWarmups(programExercise, settings);
    const sets: ISet[] = [];
    for (const programSet of programSets) {
      const minReps =
        programSet.minrep != null && programSet.minrep !== programSet.maxrep ? programSet.minrep : undefined;
      const unit = Equipment.getUnitOrDefaultForExerciseType(settings, exercise);
      const originalWeight = Weight.evaluateWeight(programSet.weight, exercise, settings);
      const weight = Weight.roundConvertTo(originalWeight, settings, unit, exercise);
      sets.push({
        reps: programSet.maxrep,
        minReps,
        weight,
        rpe: programSet.rpe,
        timer: programSet.timer,
        logRpe: programSet.logRpe,
        askWeight: programSet.askWeight,
        originalWeight,
        isAmrap: programSet.isAmrap,
        label: programSet.label,
      });
    }

    const entry = {
      exercise: exercise,
      programExerciseId: programExercise.key,
      sets,
      warmupSets: sets[0]?.weight != null ? Exercise.getWarmupSets(exercise, sets[0].weight, settings, warmupSets) : [],
    };
    const newEntry = Progress.runUpdateScriptForEntry(entry, dayData, programExercise, program.states, -1, settings);
    return newEntry;
  }

  export function getProgramExerciseById(program: IProgram, id: string): IProgramExercise | undefined {
    return program.exercises.find((e) => e.id === id);
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

  export function nextHistoryRecord(aProgram: IProgram, settings: ISettings, dayIndex?: number): IHistoryRecord {
    const program = Program.evaluate(aProgram, settings);
    const day = Math.max(1, Math.min(numberOfDays(program), Math.max(1, (dayIndex || program.nextDay) ?? 0)));
    const dayData = getDayData(program, day);
    const { week, dayInWeek } = dayData;

    const dayName = program.weeks[week - 1]?.days[dayInWeek - 1]?.name || "Day 1";
    const dayNameParts: string[] = [];
    if (program.weeks.length > 1) {
      dayNameParts.push(program.weeks[week - 1]?.name ?? "");
    }
    dayNameParts.push(dayName);
    const fullDayName = dayNameParts.join(" - ");
    const now = Date.now();
    const dayExercises = Program.getProgramDay(program, day);
    return {
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
      entries: (dayExercises?.exercises || []).map((exercise) => {
        return nextHistoryEntry(program, dayData, exercise, settings);
      }),
    };
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
    otherStates: IByExercise<IProgramState>,
    programExercise: IPlannerProgramExercise
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
    const setVariationIndex = PlannerProgramExercise.currentSetVariationIndex(programExercise);
    const descriptionIndex = PlannerProgramExercise.currentDescriptionIndex(programExercise);

    const bindings = Progress.createScriptBindings(
      dayData,
      entry,
      settings,
      undefined,
      setVariationIndex,
      descriptionIndex
    );
    const fns = Progress.createScriptFunctions(settings);
    let updates: ILiftoscriptEvaluatorUpdate[] = [];
    const newState: IProgramState = { ...state };

    const fnContext = { exerciseType: entry.exercise, unit: settings.units, prints: [] };
    console.log("script", script);
    console.log("state", newState);
    try {
      const runner = new ScriptRunner(
        script,
        newState,
        otherStates,
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

    return { success: true, data: { state: newState, updates, bindings, prints: fnContext.prints } };
  }

  export function runFinishDayScript(
    programExercise: IPlannerProgramExercise,
    program: IEvaluatedProgram,
    dayData: IDayData,
    entry: IHistoryEntry,
    settings: ISettings,
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
    const setVariationIndex = PlannerProgramExercise.currentSetVariationIndex(programExercise);
    const descriptionIndex = PlannerProgramExercise.currentDescriptionIndex(programExercise);
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
    };
    const otherStates = ObjectUtils.clone(program.states);

    let updates: ILiftoscriptEvaluatorUpdate[] = [];
    try {
      const runner = new ScriptRunner(
        PlannerProgramExercise.getProgressScript(programExercise) || "",
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

    const diffOtherStates = ObjectUtils.keys(otherStates).reduce<IByTag<IProgramState>>((memo, key) => {
      if (!ObjectUtils.isEqual(otherStates[key], program.states[key])) {
        const diffState = ObjectUtils.keys(otherStates[key]).reduce<IProgramState>((memo2, key2) => {
          if (!Weight.eq(otherStates[key][key2], program.states[key][key2])) {
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

  export function dayAverageTimeMs(program: IEvaluatedProgram, settings: ISettings): number {
    const dayApproxTimes: number[] = [];
    for (const week of program.weeks) {
      for (const day of week.days) {
        dayApproxTimes.push(dayApproxTimeMs(day, settings));
      }
    }
    return dayApproxTimes.reduce((acc, t) => acc + t, 0) / dayApproxTimes.length;
  }

  export function dayApproxTimeMs(programDay: IEvaluatedProgramDay, settings: ISettings): number {
    return programDay.exercises.reduce((acc, e) => {
      return acc + ProgramExercise.approxTimeMs(e, settings);
    }, 0);
  }

  export function runAllFinishDayScripts(
    program: IProgram,
    evaluatedProgram: IEvaluatedProgram,
    progress: IHistoryRecord,
    settings: ISettings
  ): { program: IProgram; exerciseData: IExerciseData } {
    const exerciseData: IExerciseData = {};
    const newEvaluatedProgram = ObjectUtils.clone({ ...evaluatedProgram });
    const dayData = Progress.getDayData(progress);
    const programDay = Program.getProgramDay(newEvaluatedProgram, progress.day);
    if (!programDay) {
      return { program, exerciseData };
    }
    for (const entry of progress.entries) {
      if (entry != null && entry.sets.some((s) => s.completedReps != null)) {
        const programExercise = programDay.exercises.find((e) => e.key === entry.programExerciseId);
        if (programExercise) {
          const newStateResult = Program.runFinishDayScript(
            programExercise,
            newEvaluatedProgram,
            dayData,
            entry,
            settings,
            progress.userPromptedStateVars?.[programExercise.key]
          );
          if (newStateResult.success) {
            const { state, updates, bindings, otherStates } = newStateResult.data;
            const exerciseKey = Exercise.toKey(entry.exercise);
            const onerm = Exercise.onerm(entry.exercise, settings);
            if (!Weight.eq(bindings.rm1, onerm)) {
              exerciseData[exerciseKey] = { rm1: Weight.roundTo005(bindings.rm1) };
            }
            PP.iterate2(newEvaluatedProgram.weeks, (exercise) => {
              if (exercise.key === programExercise.key) {
                exercise.state = state;
              }
            });
            ProgramExercise.applyVariables(programExercise.key, newEvaluatedProgram, updates, settings);
            for (const key of ObjectUtils.keys(otherStates || {})) {
              PP.iterate2(newEvaluatedProgram.weeks, (exercise) => {
                if (exercise.tags?.includes(Number(key))) {
                  exercise.state = { ...exercise.state, ...otherStates[key] };
                }
              });
            }
          }
        } else {
          const exercise = Exercise.get(entry.exercise, settings.exercises);
          alert(`Missing program exercise for '${exercise.name}' during executing 'progress' block`);
        }
      }
    }

    const theNextDay = Program.nextDay(newEvaluatedProgram, progress.day);
    const newPlanner = new ProgramToPlanner(newEvaluatedProgram, settings).convertToPlanner();
    console.log(PlannerProgram.generateFullText(newPlanner.weeks));
    const newProgram = ObjectUtils.clone(program);
    newProgram.nextDay = theNextDay;
    newProgram.planner = newPlanner;

    return {
      program: newProgram,
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

  export function evaluate(program: IProgram, settings: ISettings): IEvaluatedProgram {
    const planner = program.planner;
    if (!planner) {
      throw new Error("Program.evaluate: Program is not a planner program");
    }
    const { evaluatedWeeks } = PlannerEvaluator.evaluate(program.planner!, settings);
    let dayNum = 0;
    const weeks = planner.weeks.map((week, weekIndex) => {
      const evaluatedWeek = evaluatedWeeks[weekIndex];
      const days = week.days.map((day, dayInWeekIndex) => {
        dayNum += 1;
        const evaluatedDay = evaluatedWeek[dayInWeekIndex];
        const evaluatedExercises = evaluatedDay.success ? evaluatedDay.data : [];
        return {
          name: day.name,
          description: day.description,
          dayData: {
            day: dayNum,
            week: weekIndex + 1,
            dayInWeek: dayInWeekIndex + 1,
          },
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
    return {
      id: program.id,
      planner,
      name: program.name,
      nextDay: program.nextDay,
      weeks: weeks,
      states,
    };
  }

  export function numberOfDays(program: IEvaluatedProgram): number {
    return program.weeks.reduce((memo, week) => memo + week.days.length, 0);
  }

  export function daysRange(program: IEvaluatedProgram): string {
    const minDays = Math.min(...program.weeks.map((w) => w.days.length));
    const maxDays = Math.max(...program.weeks.map((w) => w.days.length));
    if (minDays === maxDays) {
      return `${minDays} ${StringUtils.pluralize("day", minDays)} per week`;
    } else {
      return `${minDays}-${maxDays} days per week`;
    }
  }

  export function exerciseRange(program: IEvaluatedProgram): string {
    const days = program.weeks.flatMap((w) => w.days);
    const minExs = Math.min(...days.map((w) => w.exercises.length));
    const maxExs = Math.max(...days.map((w) => w.exercises.length));
    if (minExs === maxExs) {
      return `${minExs} ${StringUtils.pluralize("exercise", minExs)} per day`;
    } else {
      return `${minExs}-${maxExs} exercises per day`;
    }
  }

  export function getWeekFromDay(program: IEvaluatedProgram, day: number): number {
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

  export function getDayData(program: IEvaluatedProgram, day: number): Required<IDayData> {
    return {
      day,
      week: Program.getWeekFromDay(program, day),
      dayInWeek: Program.getDayInWeek(program, day),
    };
  }

  export function getDayInWeek(program: IEvaluatedProgram, day: number): number {
    let daysTotal = 0;
    for (const week of program.weeks) {
      daysTotal += week.days.length;
      if (daysTotal >= day) {
        return day - (daysTotal - week.days.length);
      }
    }
    return 1;
  }

  export function getDayName(program: IEvaluatedProgram, day: number): string {
    const dayData = getDayData(program, day);
    const programDay = getProgramDay(program, day);
    const week = program.weeks[(dayData.week || 1) - 1];
    const isMultiweek = program.weeks.length > 1 && program.weeks.length > 1 && week != null;
    return `${isMultiweek ? `${week.name} - ` : ""}${programDay?.name}`;
  }

  export function getListOfDays(program: IEvaluatedProgram): [string, string][] {
    const days: [string, string][] = [];
    const isReallyMultiweek = program.weeks.length > 1;
    let dayIndex = 0;
    for (const week of program.weeks) {
      for (const day of week.days) {
        dayIndex += 1;
        days.push([`${dayIndex + 1}`, `${isReallyMultiweek ? `${week.name} - ` : ""}${day.name}`]);
      }
    }
    return days;
  }

  export function getProgramWeek(program: IEvaluatedProgram, day?: number): IEvaluatedProgramWeek {
    return program.weeks[Program.getWeekFromDay(program, day || 1) - 1] || program.weeks[0];
  }

  export function getProgramDay(program: IEvaluatedProgram, day: number): IEvaluatedProgramDay | undefined {
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

  export function applyEvaluatedProgram(
    program: IProgram,
    evaluatedProgram: IEvaluatedProgram,
    settings: ISettings
  ): IProgram {
    const newProgram = ObjectUtils.clone(program);
    newProgram.planner = new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner();
    newProgram.nextDay = evaluatedProgram.nextDay;
    return newProgram;
  }

  export function getProgramExercise(
    day: number,
    program?: IEvaluatedProgram,
    key?: string
  ): IPlannerProgramExercise | undefined {
    if (key == null || program == null) {
      return undefined;
    }
    const programDay = getProgramDay(program, day);
    return programDay?.exercises.find((e) => e.key === key);
  }

  export function getEvaluatedExercise(
    program: IProgram,
    day: number,
    key: string,
    settings: ISettings
  ): IPlannerProgramExercise | undefined {
    const { weeks: evaluatedWeeks } = Program.evaluate(program, settings);
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

  export function nextDay(program: IEvaluatedProgram, day?: number): number {
    const nd = (day != null ? day % numberOfDays(program) : 0) + 1;
    return isNaN(nd) ? 1 : nd;
  }

  export function editAction(
    dispatch: IDispatch,
    id: string,
    plannerState?: IPlannerState,
    resetStack?: boolean
  ): void {
    updateState(dispatch, [
      lb<IState>().p("editProgram").record({ id }),
      lb<IState>().p("editProgramV2").record(plannerState),
    ]);
    dispatch(Thunk.pushScreen("editProgram", undefined, resetStack));
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
