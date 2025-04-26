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
  IDayData,
  IExerciseData,
} from "../types";
import { ObjectUtils } from "../utils/object";
import { Exporter } from "../utils/exporter";
import { DateUtils } from "../utils/date";
import { ICustomExercise, IProgramContentSettings, IPlannerProgram, IPercentage } from "../types";
import { ProgramExercise } from "./programExercise";
import { Thunk } from "../ducks/thunks";
import { getLatestMigrationVersion } from "../migrations/migrations";
import { Encoder } from "../utils/encoder";
import { StringUtils } from "../utils/string";
import { ILiftoscriptEvaluatorUpdate } from "../liftoscriptEvaluator";
import { ProgramToPlanner } from "./programToPlanner";
import {
  IExportedPlannerProgram,
  IPlannerProgramExercise,
  IPlannerProgramExerciseUsed,
} from "../pages/planner/models/types";
import memoize from "micro-memoize";
import { Equipment } from "./equipment";
import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import { PlannerEvaluator, IByExercise, IByTag } from "../pages/planner/plannerEvaluator";
import { PP } from "./pp";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import { CollectionUtils } from "../utils/collection";
import { PlannerSyntaxError } from "../pages/planner/plannerExerciseEvaluator";
import { UrlUtils } from "../utils/url";
import { Service } from "../api/service";
import { EditProgram } from "./editProgram";

declare let __HOST__: string;

const encodedProgramHashToShortUrl: Partial<Record<string, string>> = {};

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
    return Program.evaluate(program, settings);
  }
}

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
    return state.storage.programs.find((p) => p.id === state.editProgramV2?.id);
  }

  export function isEmpty(program?: IProgram | IEvaluatedProgram): boolean {
    return program?.id === emptyProgramId;
  }

  export function getProgramExercisesFromExerciseType(
    program: IEvaluatedProgram,
    exerciseType: IExerciseType
  ): IPlannerProgramExercise[] {
    return Program.getAllUsedProgramExercises(program).filter((p) => Exercise.eq(p.exerciseType, exerciseType));
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

  export function nextHistoryEntry(
    program: IEvaluatedProgram,
    dayData: IDayData,
    programExercise: IPlannerProgramExerciseUsed,
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
      const unit = Equipment.getUnitOrDefaultForExerciseType(settings, exercise);
      const originalWeight = programSet.weight;
      const evaluatedWeight = originalWeight
        ? Weight.evaluateWeight(originalWeight, programExercise.exerciseType, settings)
        : undefined;
      const weight = evaluatedWeight
        ? Weight.roundConvertTo(evaluatedWeight, settings, unit, programExercise.exerciseType)
        : undefined;
      sets.push({
        id: UidFactory.generateUid(6),
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
        isCompleted: false,
        programSetIndex: i,
      });
    }

    const entry = {
      id: UidFactory.generateUid(6),
      exercise: exercise,
      programExerciseId: programExercise.key,
      sets,
      warmupSets: sets[0]?.weight != null ? Exercise.getWarmupSets(exercise, sets[0].weight, settings, warmupSets) : [],
    };
    const newEntry = Progress.runUpdateScriptForEntry(entry, dayData, programExercise, program.states, -1, settings);
    return newEntry;
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

    const dayName = program.weeks[week - 1]?.days[dayInWeek - 1]?.name;
    const dayNameParts: string[] = [];
    if (program.weeks.length > 1) {
      dayNameParts.push(program.weeks[week - 1]?.name ?? "");
    }
    dayNameParts.push(dayName);
    const fullDayName = dayNameParts.join(" - ");
    const now = Date.now();
    const programDay = Program.getProgramDay(program, day);
    const dayExercises = programDay ? Program.getProgramDayExercises(programDay) : [];
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
      entries: dayExercises.map((exercise) => {
        return nextHistoryEntry(program, dayData, exercise, settings);
      }),
    };
  }

  export function runExerciseFinishDayScript(
    entry: IHistoryEntry,
    dayData: IDayData,
    settings: ISettings,
    state: IProgramState,
    otherStates: IByExercise<IProgramState>,
    programExercise: IPlannerProgramExercise,
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

    const bindings = Progress.createScriptBindings(
      dayData,
      entry,
      settings,
      programExercise.evaluatedSetVariations[setVariationIndex]?.sets.length ?? 0,
      undefined,
      setVariationIndex + 1,
      descriptionIndex + 1
    );
    const fns = Progress.createScriptFunctions(settings);
    let updates: ILiftoscriptEvaluatorUpdate[] = [];
    const newState: IProgramState = ObjectUtils.clone({ ...state, ...userPromptedStateVars });

    const fnContext = { exerciseType: entry.exercise, unit: settings.units, prints: [] };
    try {
      const runner = new ScriptRunner(
        script,
        newState,
        ObjectUtils.clone(otherStates),
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

    const stateDiff = { ...entry.state, ...ObjectUtils.diff(state, newState) };
    return { success: true, data: { state: stateDiff, updates, bindings, prints: fnContext.prints } };
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
    const setVariationIndex = PlannerProgramExercise.currentEvaluatedSetVariationIndex(programExercise);
    const descriptionIndex = PlannerProgramExercise.currentDescriptionIndex(programExercise);
    const bindings = Progress.createScriptBindings(
      dayData,
      entry,
      settings,
      programExercise.evaluatedSetVariations[setVariationIndex]?.sets.length ?? 0,
      undefined,
      setVariationIndex + 1,
      descriptionIndex + 1
    );
    const fns = Progress.createScriptFunctions(settings);

    const newState: IProgramState = {
      ...state,
      ...userPromptedStateVars,
    };
    const otherStates = ObjectUtils.clone(program.states);

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

    const stateDiff = ObjectUtils.diff(state, newState);
    return { success: true, data: { state: stateDiff, otherStates: diffOtherStates, updates, bindings } };
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
    return Program.getProgramDayExercises(programDay).reduce((acc, e) => {
      return acc + ProgramExercise.approxTimeMs(e, settings);
    }, 0);
  }

  export function runAllFinishDayScripts(
    program: IProgram,
    progress: IHistoryRecord,
    settings: ISettings
  ): { program: IProgram; exerciseData: IExerciseData } {
    const exerciseData: IExerciseData = {};
    const newEvaluatedProgram = Program.evaluate(program, settings);
    const dayData = Progress.getDayData(progress);
    const programDay = Program.getProgramDay(newEvaluatedProgram, progress.day);
    if (!programDay) {
      return { program, exerciseData };
    }
    for (const entry of progress.entries) {
      if (entry != null && entry.sets.some((s) => s.isCompleted)) {
        const dayExercises = Program.getProgramDayExercises(programDay);
        const programExercise = dayExercises.find((e) => e.key === entry.programExerciseId);
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
              if (exercise.key === programExercise.key && exercise.progress) {
                exercise.progress.state = { ...exercise.progress.state, ...entry.state, ...state };
              }
            });
            ProgramExercise.applyVariables(programExercise.key, newEvaluatedProgram, updates, settings);
            for (const key of ObjectUtils.keys(otherStates || {})) {
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
    const theNextDay = Program.nextDay(newEvaluatedProgram, progress.day);
    const newPlanner = new ProgramToPlanner(newEvaluatedProgram, settings).convertToPlanner();
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
      days: [],
      weeks: [],
      isMultiweek: false,
      planner: {
        name: "Ad-Hoc Workout",
        weeks: [{ name: "", days: [{ name: "", exerciseText: "" }] }],
      },
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

  export function getAllProgramExercises(evaluatedProgram: IEvaluatedProgram): IPlannerProgramExercise[] {
    return evaluatedProgram.weeks.flatMap((w) => w.days.flatMap((d) => d.exercises));
  }

  export function getAllUsedProgramExercises(evaluatedProgram: IEvaluatedProgram): IPlannerProgramExerciseUsed[] {
    const used = getAllProgramExercises(evaluatedProgram).filter((e) => !e.notused && e.exerciseType != null);
    return used as IPlannerProgramExerciseUsed[];
  }

  export const evaluate = memoize(
    (program: IProgram, settings: ISettings): IEvaluatedProgram => {
      const planner = program.planner;
      if (!planner) {
        return {
          type: "evaluatedProgram",
          id: program.id,
          planner: {
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
      const { evaluatedWeeks } = PlannerEvaluator.evaluate(program.planner!, settings);
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
          const evaluatedExercises = CollectionUtils.sortBy(evaluatedDay.success ? evaluatedDay.data : [], "order");
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
    },
    {
      maxSize: 10,
    }
  );

  export function changeExerciseName(from: string, to: string, program: IProgram, settings: ISettings): IProgram {
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

  export function numberOfDays(program: IEvaluatedProgram): number {
    return program.weeks.reduce((memo, week) => memo + week.days.length, 0);
  }

  export function weeksRange(program: IEvaluatedProgram): string | undefined {
    return program.weeks.length > 1
      ? `${program.weeks.length} ${StringUtils.pluralize("week", program.weeks.length)}`
      : "";
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
    const minExs = Math.min(...days.map((d) => Program.getProgramDayExercises(d).length));
    const maxExs = Math.max(...days.map((d) => Program.getProgramDayExercises(d).length));
    return exerciseRangeFormat(minExs, maxExs);
  }

  export function exerciseRangeFormat(minExs: number, maxExs: number): string {
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
        days.push([`${dayIndex}`, `${isReallyMultiweek ? `${week.name} - ` : ""}${day.name}`]);
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

  export function getProgramDayExercises(programDay: IEvaluatedProgramDay): IPlannerProgramExerciseUsed[] {
    const list = programDay.exercises.filter((e) => !e.notused && e.exerciseType != null);
    return list as IPlannerProgramExerciseUsed[];
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

  export function getProgramExerciseFromDay(
    programDay?: IEvaluatedProgramDay,
    key?: string
  ): IPlannerProgramExercise | undefined {
    if (key == null || programDay == null) {
      return undefined;
    }
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

  export function editAction(dispatch: IDispatch, program: IProgram, dayData?: IDayData, resetStack?: boolean): void {
    const plannerState = EditProgram.initPlannerState(program.id, program, dayData);
    updateState(dispatch, [lb<IState>().p("editProgramV2").record(plannerState)]);
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
    const aFullProgram = Program.evaluate(program, settings);
    const customExerciseIds = Program.getAllProgramExercises(aFullProgram).reduce<string[]>((memo, programExercise) => {
      const id = programExercise.exerciseType?.id;
      if (id) {
        const isBuiltIn = !!Exercise.findById(id, {});
        if (!isBuiltIn) {
          memo.push(id);
        }
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

  export async function toUrl(program: IProgram, settings: ISettings, client: Window["fetch"]): Promise<string> {
    const exportProgram = Program.exportProgram(program, settings);
    const baseUrl = UrlUtils.build(
      "/planner",
      typeof window !== "undefined" ? window.location.href : "https://www.liftosaur.com"
    );
    const json = JSON.stringify(exportProgram);
    const hash = StringUtils.hashString(json);
    const encodedUrl = await Encoder.encodeIntoUrl(json, baseUrl.toString());
    const encodedProgramUrl = encodedUrl.toString();
    if (encodedProgramHashToShortUrl[hash]) {
      return encodedProgramHashToShortUrl[hash];
    } else {
      const service = new Service(client);
      const shortUrl = await service.postShortUrl(encodedProgramUrl, "p");
      encodedProgramHashToShortUrl[hash] = shortUrl;
      return shortUrl;
    }
  }

  export function createFromHistoryRecord(programName: string, record: IHistoryRecord, settings: ISettings): IProgram {
    const dayData = { week: 1, day: 1, dayInWeek: 1 };
    const program: IProgram = {
      ...Program.create(programName),
      planner: {
        name: programName,
        weeks: [{ name: "Week 1", days: [{ name: "Day 1", exerciseText: "" }] }],
      },
    };
    const evaluatedProgram = Program.evaluate(program, settings);
    const planner = program.planner!;
    planner.weeks[0].days[0].exerciseText = record.entries
      .map((entry) => {
        const exercise = Exercise.get(entry.exercise, settings.exercises);
        return Exercise.fullName(exercise, settings);
      })
      .join("\n");
    const newDay: IEvaluatedProgramDay = {
      dayData: dayData,
      name: "Day 1",
      exercises: record.entries.map((e) => {
        return PlannerProgramExercise.createExerciseFromEntry(e, dayData, settings);
      }),
    };
    evaluatedProgram.weeks[0].days[0] = newDay;
    const newPlanner = new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner();
    const newProgram = {
      ...ObjectUtils.clone(program),
      planner: newPlanner,
    };
    return newProgram;
  }

  export function addDayFromHistoryRecord(
    program: IProgram,
    afterDay: number,
    record: IHistoryRecord,
    settings: ISettings
  ): { program: IProgram; dayData: Required<IDayData> } {
    const evaluatedProgram = Program.evaluate(program, settings);
    const dayData = Program.getDayData(evaluatedProgram, afterDay);
    const newDayData = { week: dayData.week, day: dayData.day + 1, dayInWeek: dayData.dayInWeek + 1 };
    const newDay: IEvaluatedProgramDay = {
      dayData: newDayData,
      name: `Day ${dayData.day + 1}`,
      exercises: record.entries.map((e) => {
        return PlannerProgramExercise.createExerciseFromEntry(e, newDayData, settings);
      }),
    };
    evaluatedProgram.weeks[dayData.week - 1].days.splice(dayData.dayInWeek, 0, newDay);
    evaluatedProgram.planner.weeks[dayData.week - 1].days.splice(dayData.dayInWeek, 0, {
      name: newDay.name,
      exerciseText: newDay.exercises.map((e) => e.fullName).join("\n"),
    });
    const newPlanner = new ProgramToPlanner(evaluatedProgram, settings).convertToPlanner();
    const newProgram = {
      ...ObjectUtils.clone(program),
      planner: newPlanner,
    };
    return { program: newProgram, dayData: newDayData };
  }
}
