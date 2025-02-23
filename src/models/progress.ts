/* eslint-disable @typescript-eslint/unified-signatures */
import { Exercise } from "./exercise";
import { Reps } from "./set";
import { Weight } from "./weight";
import { Screen } from "./screen";
import { DateUtils } from "../utils/date";
import { lf, lb } from "lens-shmens";
import { ObjectUtils } from "../utils/object";
import { IDispatch } from "../ducks/types";
import { ScriptRunner } from "../parser";

import { IEvaluatedProgram, Program } from "./program";
import { IState, updateState } from "./state";
import {
  IWeight,
  IHistoryEntry,
  ISettings,
  IHistoryRecord,
  IProgressMode,
  IExerciseType,
  IProgressUi,
  IProgram,
  IProgramState,
  IEquipment,
  IProgramExercise,
  ISubscription,
  ISet,
  IDayData,
  IExerciseDataValue,
  IUnit,
  IPlannerProgram,
} from "../types";
import { SendMessage } from "../utils/sendMessage";
import { ProgramExercise } from "./programExercise";
import { Subscriptions } from "../utils/subscriptions";
import { IPercentage } from "../types";
import { History } from "./history";
import { CollectionUtils } from "../utils/collection";
import { MathUtils } from "../utils/math";
import { ILiftoscriptEvaluatorUpdate } from "../liftoscriptEvaluator";
import { Equipment } from "./equipment";
import { IByExercise } from "../pages/planner/plannerEvaluator";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";

export interface IScriptBindings {
  day: number;
  week: number;
  dayInWeek: number;
  originalWeights: IWeight[];
  weights: IWeight[];
  rm1: IWeight;
  reps: number[];
  minReps: (number | undefined)[];
  amraps: (number | undefined)[];
  logrpes: (number | undefined)[];
  timers: (number | undefined)[];
  RPE: (number | undefined)[];
  completedRPE: (number | undefined)[];
  completedReps: (number | undefined)[];
  w: IWeight[];
  r: number[];
  mr: (number | undefined)[];
  cr: (number | undefined)[];
  ns: number;
  numberOfSets: number;
  setVariationIndex: number;
  descriptionIndex: number;
  setIndex: number;
}

export interface IScriptFnContext {
  prints: (number | IWeight | IPercentage)[][];
  unit: IUnit;
  exerciseType?: IExerciseType;
}

export interface IScriptFinishContext {
  type: "finish";
  updates: ILiftoscriptEvaluatorUpdate[];
  exerciseData: IExerciseDataValue;
  setVariationIndex: number;
  descriptionIndex: number;
}

export interface IScriptUpdateContext {
  equipment?: IEquipment;
}

export interface IScriptFunctions {
  roundWeight: (num: IWeight, context: IScriptFnContext) => IWeight;
  calculateTrainingMax: (weight: IWeight, reps: number, context: IScriptFnContext) => IWeight;
  calculate1RM: (weight: IWeight, reps: number, context: IScriptFnContext) => IWeight;
  rpeMultiplier: (reps: number, rpe: number, context: IScriptFnContext) => number;
  floor(num: number): number;
  floor(num: IWeight): IWeight;
  ceil(num: number): number;
  ceil(num: IWeight): IWeight;
  round(num: number): number;
  round(num: IWeight): IWeight;
  sum(vals: number[]): number;
  sum(vals: IWeight[]): IWeight;
  min(vals: number[]): number;
  min(vals: IWeight[]): IWeight;
  max(vals: number[]): number;
  max(vals: IWeight[]): IWeight;
  zeroOrGte(a: number[] | IWeight[], b: number[] | IWeight[]): boolean;
  print(...args: unknown[]): typeof args[0];
  sets(
    from: number,
    to: number,
    minReps: number,
    reps: number,
    isAmrap: number,
    weight: IWeight | IPercentage | number,
    timer: number,
    rpe: number,
    logRpe: number,
    context: IScriptFnContext,
    bindings: IScriptBindings
  ): number;
}

function floor(num: number): number;
function floor(num: IWeight): IWeight;
function floor(num: IWeight | number): IWeight | number {
  if (num == null) {
    return 0;
  }
  return typeof num === "number" ? Math.floor(num) : Weight.build(Math.floor(num.value), num.unit);
}

function ceil(num: number): number;
function ceil(num: IWeight): IWeight;
function ceil(num: IWeight | number): IWeight | number {
  if (num == null) {
    return 0;
  }
  return typeof num === "number" ? Math.ceil(num) : Weight.build(Math.ceil(num.value), num.unit);
}

function round(num: number): number;
function round(num: IWeight): IWeight;
function round(num: IWeight | number): IWeight | number {
  if (num == null) {
    return 0;
  }
  return typeof num === "number" ? Math.round(num) : Weight.build(Math.round(num.value), num.unit);
}

function sum(vals: number[]): number;
function sum(vals: IWeight[]): IWeight;
function sum(vals: IWeight[] | number[]): IWeight | number {
  const firstElement = vals[0];
  if (firstElement == null) {
    return 0;
  }
  if (typeof firstElement === "number") {
    return (vals as number[]).reduce((acc, a) => acc + (a || 0), 0);
  } else {
    return (vals as IWeight[]).reduce((acc, a) => Weight.add(acc, a || 0), Weight.build(0, firstElement.unit));
  }
}

function min(vals: number[]): number;
function min(vals: IWeight[]): IWeight;
function min(vals: IWeight[] | number[]): IWeight | number {
  const firstElement = vals[0];
  if (firstElement == null) {
    return 0;
  }
  if (typeof firstElement === "number") {
    vals = vals.map((v) => v ?? 0) as number[];
    return Math.min(...(vals as number[]));
  } else {
    vals = vals.map((v) => v ?? Weight.build(0, "lb")) as IWeight[];
    const sortedWeights = (vals as IWeight[]).sort((a, b) => Weight.compare(a, b));
    return sortedWeights[0];
  }
}

function max(vals: number[]): number;
function max(vals: IWeight[]): IWeight;
function max(vals: IWeight[] | number[]): IWeight | number {
  const firstElement = vals[0];
  if (firstElement == null) {
    return 0;
  }
  if (typeof firstElement === "number") {
    vals = vals.map((v) => v ?? 0) as number[];
    return Math.max(...(vals as number[]));
  } else {
    vals = vals.map((v) => v ?? Weight.build(0, "lb")) as IWeight[];
    const sortedWeights = (vals as IWeight[]).sort((a, b) => Weight.compare(b, a));
    return sortedWeights[0];
  }
}

function zeroOrGte(a: IWeight[] | number[], b: IWeight[] | number[]): boolean {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const aVal = a[i];
    const bVal = b[i];
    if (aVal != null && bVal != null && !Weight.eq(aVal, 0) && Weight.lt(aVal, bVal)) {
      return false;
    }
  }
  return true;
}

export namespace Progress {
  export function createEmptyScriptBindings(
    dayData: IDayData,
    settings: ISettings,
    exercise?: IExerciseType
  ): IScriptBindings {
    const rm1 = exercise ? Exercise.onerm(exercise, settings) : Weight.build(0, "lb");
    return {
      day: dayData.day,
      week: dayData.week ?? 1,
      dayInWeek: dayData.dayInWeek ?? dayData.day,
      originalWeights: [],
      weights: [],
      reps: [],
      minReps: [],
      RPE: [],
      amraps: [],
      logrpes: [],
      completedReps: [],
      completedRPE: [],
      timers: [],
      w: [],
      r: [],
      cr: [],
      mr: [],
      numberOfSets: 0,
      ns: 0,
      setVariationIndex: 1,
      descriptionIndex: 1,
      setIndex: 1,
      rm1,
    };
  }

  export function createScriptBindings(
    dayData: IDayData,
    entry: IHistoryEntry,
    settings: ISettings,
    setIndex?: number,
    setVariationIndex?: number,
    descriptionIndex?: number
  ): IScriptBindings {
    const bindings = createEmptyScriptBindings(dayData, settings, entry.exercise);
    for (const set of entry.sets) {
      bindings.weights.push(set.weight);
      bindings.originalWeights.push(set.originalWeight);
      bindings.reps.push(set.reps);
      bindings.minReps.push(set.minReps);
      bindings.completedReps.push(set.completedReps);
      bindings.completedRPE.push(set.completedRpe);
      bindings.RPE.push(set.rpe);
      bindings.amraps.push(set.isAmrap ? 1 : undefined);
      bindings.logrpes.push(set.logRpe ? 1 : undefined);
      bindings.timers.push(set.timer);
    }
    bindings.w = bindings.weights;
    bindings.r = bindings.reps;
    bindings.cr = bindings.completedReps;
    bindings.mr = bindings.minReps;
    bindings.ns = entry.sets.length;
    bindings.numberOfSets = entry.sets.length;
    bindings.setIndex = setIndex ?? 1;
    bindings.setVariationIndex = setVariationIndex ?? 1;
    bindings.descriptionIndex = descriptionIndex != null ? descriptionIndex - 1 : 1;
    return bindings;
  }

  export function createScriptFunctions(settings: ISettings): IScriptFunctions {
    return {
      roundWeight: (num, context) => {
        if (!Weight.is(num)) {
          num = Weight.build(num, settings.units);
        }
        const unit = Equipment.getUnitForExerciseType(settings, context?.exerciseType);
        return Weight.round(num, settings, unit ?? settings.units, context?.exerciseType);
      },
      calculateTrainingMax: (weight, reps, context) => {
        if (!Weight.is(weight)) {
          weight = Weight.build(weight, settings.units);
        }
        return Weight.getTrainingMax(weight, reps || 0, settings);
      },
      calculate1RM: (weight, reps, context) => {
        if (!Weight.is(weight)) {
          weight = Weight.build(weight, settings.units);
        }
        return Weight.getOneRepMax(weight, reps);
      },
      rpeMultiplier: (repsRaw, rpeRawOrContext, context) => {
        const reps = Weight.is(repsRaw) ? repsRaw.value : typeof repsRaw === "number" ? repsRaw : 1;
        const rpe =
          typeof rpeRawOrContext === "number" && context != null
            ? Weight.is(rpeRawOrContext)
              ? rpeRawOrContext.value
              : typeof rpeRawOrContext === "number"
              ? rpeRawOrContext
              : 10
            : 10;
        return Weight.rpeMultiplier(reps, rpe);
      },
      floor,
      ceil,
      round,
      sum,
      min,
      max,
      zeroOrGte,
      print: (...fnArgs) => {
        fnArgs.pop();
        const context = fnArgs.pop() as IScriptFnContext;
        const args = [...fnArgs] as (number | IWeight | IPercentage)[];
        context.prints = context.prints || [];
        context.prints.push(args);
        return args[0];
      },
      sets(
        from: number,
        to: number,
        minReps: number,
        reps: number,
        isAmrap: number,
        weight: IWeight | IPercentage | number,
        timer: number,
        rpe: number,
        logRpe: number,
        context: IScriptFnContext,
        bindings: IScriptBindings
      ): number {
        for (let i = 0; i < bindings.numberOfSets; i++) {
          if (i >= from - 1 && i < to) {
            const weightValue = Weight.convertToWeight(bindings.rm1, weight, context.unit);
            bindings.minReps[i] = reps !== minReps ? minReps : undefined;
            bindings.reps[i] = reps;
            bindings.originalWeights[i] = weightValue;
            bindings.weights[i] = Weight.round(weightValue, settings, context.unit, context.exerciseType);
            bindings.RPE[i] = rpe !== 0 ? rpe : undefined;
            bindings.amraps[i] = isAmrap !== 0 ? 1 : 0;
            bindings.logrpes[i] = logRpe !== 0 ? 1 : 0;
            bindings.timers[i] = timer !== 0 ? timer : undefined;
          }
        }
        return to - from;
      },
    };
  }

  export function isCurrent(progress: IHistoryRecord): boolean {
    return progress.id === 0;
  }

  export function getCustomWorkoutTimerValue(
    progress: IHistoryRecord,
    program: IProgram,
    entryIndex: number,
    setIndex: number,
    settings: ISettings
  ): number | undefined {
    let timer: number | undefined;
    const entry = progress.entries[entryIndex];
    const programExercise =
      entry && program ? program.exercises.filter((p) => p.id === entry.programExerciseId)[0] : null;
    if (programExercise != null && program != null) {
      const set = entry.sets[setIndex];
      const exercise = programExercise.exerciseType;
      const state = ProgramExercise.getState(programExercise, program.exercises);
      const setVariationIndexResult = Program.runVariationScript(
        programExercise,
        program.exercises,
        state,
        Progress.getDayData(progress),
        settings
      );
      const setVariationIndex = setVariationIndexResult.success ? setVariationIndexResult.data : 1;
      const setTimerExpr = programExercise.variations[setVariationIndex - 1]?.sets[setIndex]?.timerExpr;
      const timerExpr = set.timer ?? (setTimerExpr || ProgramExercise.getTimerExpr(programExercise, program.exercises));
      const bindings = Progress.createScriptBindings(
        Progress.getDayData(progress),
        entry,
        settings,
        setIndex + 1,
        setVariationIndex
      );
      if (timerExpr != null && `${timerExpr}`.trim() && state) {
        timer = ScriptRunner.safe(
          () =>
            new ScriptRunner(
              `${timerExpr}`.trim(),
              state,
              {},
              bindings,
              Progress.createScriptFunctions(settings),
              settings.units,
              {
                exerciseType: exercise,
                unit: settings.units,
                prints: [],
              },
              "regular"
            ).execute("timer"),
          (e) => {
            return `There's an error while calculating timer for the next workout for '${exercise.id}' exercise:\n\n${e.message}.\n\nWe fallback to a default timer. Please fix the program's timer script.`;
          },
          undefined,
          false
        );
      }
    }
    return timer;
  }

  export function startTimer(
    progress: IHistoryRecord,
    program: IProgram,
    timestamp: number,
    mode: IProgressMode,
    entryIndex: number,
    setIndex: number,
    subscription: ISubscription,
    settings: ISettings,
    timer?: number
  ): IHistoryRecord {
    if (timer == null && Progress.isCurrent(progress) && mode === "workout") {
      timer = getCustomWorkoutTimerValue(progress, program, entryIndex, setIndex, settings);
    }
    if (timer == null) {
      timer = settings.timers[mode] || undefined;
    }
    if (!timer) {
      return {
        ...progress,
        timerSince: undefined,
        timer: undefined,
        timerMode: undefined,
        timerEntryIndex: undefined,
        timerSetIndex: undefined,
      };
    }
    if (Subscriptions.hasSubscription(subscription)) {
      const timerForPush = timer - Math.round((Date.now() - timestamp) / 1000);
      const title = "It's time for the next set!";
      let subtitle = "";
      let body = "Time to lift!";
      let subtitleHeader = "";
      let bodyHeader = "The rest is over";
      const nextEntryAndSet = Reps.findNextEntryAndSet(progress, entryIndex);
      if (nextEntryAndSet != null) {
        const { entry, set } = nextEntryAndSet;
        const exercise = Exercise.get(entry.exercise, settings.exercises);
        if (exercise) {
          const { plates } = Weight.calculatePlates(set.weight, settings, set.weight.unit, entry.exercise);
          subtitleHeader = "Next Set";
          subtitle = `${exercise.name}, ${set.reps}${set.isAmrap ? "+" : ""} reps, ${Weight.display(set.weight)}`;
          const formattedPlates = plates.length > 0 ? Weight.formatOneSide(settings, plates, exercise) : "None";
          bodyHeader = "Plates per side";
          body = formattedPlates;
        }
      }
      const ignoreDoNotDisturb = settings.ignoreDoNotDisturb ? "true" : "false";
      SendMessage.toIos({
        type: "startTimer",
        duration: timerForPush.toString(),
        mode,
        title,
        subtitleHeader,
        subtitle,
        bodyHeader,
        body,
        ignoreDoNotDisturb,
      });
      SendMessage.toAndroid({
        type: "startTimer",
        duration: timer.toString(),
        mode,
        title,
        subtitleHeader,
        subtitle,
        bodyHeader,
        body,
        ignoreDoNotDisturb,
      });
    }
    return {
      ...progress,
      timerSince: timestamp,
      timer,
      timerMode: mode,
      timerEntryIndex: entryIndex,
      timerSetIndex: setIndex,
    };
  }

  export function stopTimer(progress: IHistoryRecord): IHistoryRecord {
    SendMessage.toIos({ type: "stopTimer" });
    SendMessage.toAndroid({ type: "stopTimer" });
    return {
      ...progress,
      timerSince: undefined,
      timerMode: undefined,
      timerSetIndex: undefined,
      timerEntryIndex: undefined,
    };
  }

  export function findEntryByExercise(
    progress: IHistoryRecord,
    exerciseType: IExerciseType
  ): IHistoryEntry | undefined {
    return progress.entries.find((entry) => entry.exercise === exerciseType);
  }

  export function isFullyCompletedSet(progress: IHistoryRecord): boolean {
    return progress.entries.every((entry) => isCompletedSet(entry));
  }

  export function isCompletedSet(entry: IHistoryEntry): boolean {
    return Reps.isCompleted(entry.sets);
  }

  export function isFullyFinishedSet(progress: IHistoryRecord): boolean {
    return progress.entries.every((entry) => isFinishedSet(entry));
  }

  export function isFullyEmptySet(progress: IHistoryRecord): boolean {
    return progress.entries.every((entry) => Reps.isEmpty(entry.sets));
  }

  export function isFinishedSet(entry: IHistoryEntry): boolean {
    return Reps.isFinished(entry.sets);
  }

  export function hasLastUnfinishedSet(entry: IHistoryEntry): boolean {
    return entry.sets.filter((s) => s.completedReps == null).length === 1;
  }

  export function showUpdateWeightModal(
    progress: IHistoryRecord,
    exercise: IExerciseType,
    weight: IWeight,
    programExercise?: IPlannerProgramExercise
  ): IHistoryRecord {
    return {
      ...progress,
      ui: {
        ...progress.ui,
        weightModal: {
          exercise,
          weight: weight,
          programExerciseId: programExercise?.key,
        },
      },
    };
  }

  export function showUpdateDate(progress: IHistoryRecord, date: string, time: number): IHistoryRecord {
    return {
      ...progress,
      ui: {
        ...progress.ui,
        dateModal: { date, time },
      },
    };
  }

  export function stop(
    progresses: Record<number, IHistoryRecord | undefined>,
    id: number
  ): Record<number, IHistoryRecord | undefined> {
    return ObjectUtils.keys(progresses).reduce<Record<number, IHistoryRecord | undefined>>((memo, k) => {
      const p = progresses[k];
      if (p != null && p.id !== id) {
        memo[k] = p;
      }
      return memo;
    }, {});
  }

  export function changeDate(progress: IHistoryRecord, date?: string, time?: number): IHistoryRecord {
    const endTime = time != null ? progress.startTime + time : progress.startTime + History.workoutTime(progress);
    return {
      ...progress,
      ...(date != null ? { date: DateUtils.fromYYYYMMDD(date) } : {}),
      intervals: [[progress.startTime, endTime]],
      endTime,
      ui: {
        ...progress.ui,
        dateModal: undefined,
      },
    };
  }

  export function getProgress(state: Pick<IState, "currentHistoryRecord" | "progress">): IHistoryRecord | undefined {
    return state.currentHistoryRecord != null ? state.progress[state.currentHistoryRecord] : undefined;
  }

  export function setProgress(state: IState, progress: IHistoryRecord): IState {
    if (state.currentHistoryRecord != null) {
      return lf(state).p("progress").p(state.currentHistoryRecord).set(progress);
    } else {
      return state;
    }
  }

  export function runUpdateScriptForEntry(
    entry: IHistoryEntry,
    dayData: IDayData,
    programExercise: IPlannerProgramExercise,
    otherStates: IByExercise<IProgramState>,
    setIndex: number,
    settings: ISettings
  ): IHistoryEntry {
    if (setIndex !== -1 && entry?.sets[setIndex]?.completedReps == null) {
      return entry;
    }
    const script = programExercise.properties.find((p) => p.name === "update")?.script;
    if (!script) {
      return entry;
    }
    const exercise = programExercise.exerciseType;
    const state = PlannerProgramExercise.getState(programExercise);
    const setVariationIndex = PlannerProgramExercise.currentSetVariationIndex(programExercise);
    const descriptionIndex = PlannerProgramExercise.currentDescriptionIndex(programExercise);
    const bindings = Progress.createScriptBindings(
      dayData,
      entry,
      settings,
      setIndex + 1,
      setVariationIndex,
      descriptionIndex
    );
    try {
      const fnContext: IScriptFnContext = { exerciseType: exercise, unit: settings.units, prints: [] };
      const runner = new ScriptRunner(
        script,
        state,
        otherStates,
        bindings,
        Progress.createScriptFunctions(settings),
        settings.units,
        fnContext,
        "update"
      );
      runner.execute();
      const newEntry = Progress.applyBindings(entry, bindings);
      if (fnContext.prints.length > 0) {
        newEntry.updatePrints = fnContext.prints;
      }
      return newEntry;
    } catch (error) {
      const e = error as Error;
      console.error(e);
      alert(`Error during executing 'update: custom()' script: ${e.message}`);
      return entry;
    }
    return entry;
  }

  export function runInitialUpdateScripts(
    aProgress: IHistoryRecord,
    programExerciseIds: string[] | undefined,
    program: IEvaluatedProgram,
    settings: ISettings
  ): IHistoryRecord {
    const programExercises = programExerciseIds
      ? CollectionUtils.compact(
          programExerciseIds.map((id) => {
            const programExercise = program.exercises.find((e) => e.id === id);
            return programExercise ? ProgramExercise.getProgramExercise(programExercise, program.exercises) : undefined;
          })
        )
      : program.exercises;

    return {
      ...aProgress,
      entries: aProgress.entries.map((entry) => {
        const programExercise =
          entry.programExerciseId != null ? programExercises.find((e) => e.id === entry.programExerciseId) : undefined;
        if (!programExercise) {
          return entry;
        }
        return runUpdateScriptForEntry(
          entry,
          Progress.getDayData(aProgress),
          programExercise,
          program.states,
          -1,
          settings
        );
      }),
    };
  }

  export function runUpdateScript(
    aProgress: IHistoryRecord,
    programExercise: IPlannerProgramExercise,
    otherStates: IByExercise<IProgramState>,
    entryIndex: number,
    setIndex: number,
    mode: IProgressMode,
    settings: ISettings
  ): IHistoryRecord {
    if (mode === "warmup") {
      return aProgress;
    }
    const entry = aProgress.entries[entryIndex];
    const newEntry = runUpdateScriptForEntry(
      entry,
      Progress.getDayData(aProgress),
      programExercise,
      otherStates,
      setIndex,
      settings
    );
    const progress = lf(aProgress).p("entries").i(entryIndex).set(newEntry);
    return progress;
  }

  export function applyBindings(oldEntry: IHistoryEntry, bindings: IScriptBindings): IHistoryEntry {
    const keys = ["RPE", "minReps", "reps", "weights", "amraps", "logrpes", "timers", "originalWeights"] as const;
    const entry = ObjectUtils.clone(oldEntry);
    const lastCompletedIndex = CollectionUtils.findIndexReverse(bindings.completedReps, (r) => r != null) + 1;
    entry.sets = entry.sets.slice(0, Math.max(lastCompletedIndex, bindings.numberOfSets, 1));
    for (const key of keys) {
      for (let i = 0; i < bindings[key].length; i += 1) {
        if (entry.sets[i] == null) {
          entry.sets[i] = { reps: 0, weight: Weight.build(0, "lb"), originalWeight: Weight.build(0, "lb") };
        }
        if (entry.sets[i].completedReps == null) {
          if (key === "RPE") {
            const value = bindings.RPE[i];
            entry.sets[i].rpe = value !== 0 ? value : undefined;
          } else if (key === "reps") {
            const value = bindings.reps[i];
            entry.sets[i].reps = value;
          } else if (key === "minReps") {
            const value = bindings.minReps[i];
            entry.sets[i].minReps = value !== 0 ? value : undefined;
          } else if (key === "weights") {
            const value = bindings.weights[i];
            entry.sets[i].weight = value;
          } else if (key === "originalWeights") {
            const value = bindings.originalWeights[i];
            entry.sets[i].originalWeight = value;
          } else if (key === "amraps") {
            const value = bindings.amraps[i];
            entry.sets[i].isAmrap = !!value;
          } else if (key === "logrpes") {
            const value = bindings.logrpes[i];
            entry.sets[i].logRpe = !!value;
          } else if (key === "timers") {
            const value = bindings.timers[i];
            entry.sets[i].timer = value !== 0 ? value : undefined;
          }
        }
      }
    }
    return entry;
  }

  export function updateRepsInExercise(
    progress: IHistoryRecord,
    entryIndex: number,
    setIndex: number,
    mode: IProgressMode,
    hasUserPromptedVars: boolean
  ): IHistoryRecord {
    const entry = progress.entries[entryIndex];
    if (mode === "warmup") {
      const firstWeight = entry?.sets[0]?.weight;
      if (firstWeight != null) {
        return {
          ...progress,
          entries: progress.entries.map((progressEntry, i) => {
            if (i === entryIndex) {
              const progressSets = progressEntry.warmupSets;
              const progressSet = progressSets[setIndex];
              if (progressSet?.completedReps == null) {
                progressSets[setIndex] = { ...progressSet, completedReps: progressSet.reps as number };
              } else if (progressSet.completedReps > 0) {
                progressSets[setIndex] = {
                  ...progressSet,
                  completedReps: progressSet.completedReps - 1,
                };
              } else {
                progressSets[setIndex] = { ...progressSet, completedReps: undefined };
              }
              return { ...progressEntry, warmupSets: progressSets };
            } else {
              return progressEntry;
            }
          }),
        };
      } else {
        return progress;
      }
    } else {
      const isAmrap = entry.sets[setIndex].isAmrap;
      const shouldLogRpe = (!Reps.isFinishedSet(entry.sets[setIndex]) || isAmrap) && !!entry.sets[setIndex].logRpe;
      const shouldAskWeight =
        (!Reps.isFinishedSet(entry.sets[setIndex]) || isAmrap) && !!entry.sets[setIndex].askWeight;
      const shouldPromptUserVars =
        hasUserPromptedVars &&
        ((Progress.hasLastUnfinishedSet(entry) && !Reps.isFinishedSet(entry.sets[setIndex])) ||
          (isAmrap && Progress.isFinishedSet(entry)));

      if (isAmrap || shouldLogRpe || shouldPromptUserVars || shouldAskWeight) {
        const amrapUi: IProgressUi = {
          amrapModal: {
            entryIndex,
            setIndex,
            isAmrap: isAmrap,
            logRpe: shouldLogRpe,
            askWeight: shouldAskWeight,
            userVars: shouldPromptUserVars,
          },
        };
        return {
          ...progress,
          ui: {
            ...progress.ui,
            ...amrapUi,
          },
        };
      } else {
        return {
          ...progress,
          entries: progress.entries.map((progressEntry, i) => {
            if (i === entryIndex) {
              const sets = [...progressEntry.sets];
              const set = sets[setIndex];
              if (set.completedReps == null) {
                sets[setIndex] = {
                  ...set,
                  completedReps: set.reps as number,
                  timestamp: set.timestamp ?? Date.now(),
                };
              } else if (set.completedReps > 0) {
                sets[setIndex] = {
                  ...set,
                  completedReps: set.completedReps - 1,
                  timestamp: set.timestamp ?? Date.now(),
                };
              } else {
                sets[setIndex] = { ...set, completedReps: undefined, timestamp: set.timestamp ?? Date.now() };
              }
              return { ...progressEntry, sets: sets };
            } else {
              return progressEntry;
            }
          }),
        };
      }
    }
  }

  export function updateAmrapRepsInExercise(
    progress: IHistoryRecord,
    value?: number,
    isAmrap?: boolean
  ): IHistoryRecord {
    if (progress.ui?.amrapModal != null) {
      const { entryIndex, setIndex } = progress.ui.amrapModal;
      return {
        ...progress,
        entries: progress.entries.map((progressEntry, i) => {
          if (i === entryIndex) {
            const sets = [...progressEntry.sets];
            const set = sets[setIndex];
            if (isAmrap) {
              if (value == null) {
                sets[setIndex] = { ...set, completedReps: undefined };
              } else {
                sets[setIndex] = { ...set, completedReps: value };
              }
            } else {
              sets[setIndex] = { ...set, completedReps: set.reps };
            }
            return { ...progressEntry, sets: sets };
          } else {
            return progressEntry;
          }
        }),
      };
    } else {
      return progress;
    }
  }

  export function updateRpeInExercise(progress: IHistoryRecord, value?: number): IHistoryRecord {
    if (progress.ui?.amrapModal != null) {
      const { entryIndex, setIndex } = progress.ui.amrapModal;
      return {
        ...progress,
        entries: progress.entries.map((progressEntry, i) => {
          if (i === entryIndex) {
            const sets = [...progressEntry.sets];
            const set = sets[setIndex];
            if (value == null) {
              sets[setIndex] = { ...set, completedRpe: undefined };
            } else if (typeof value === "number") {
              value = Math.round(Math.min(10, Math.max(0, value)) / 0.5) * 0.5;
              sets[setIndex] = { ...set, completedRpe: value };
            }
            return { ...progressEntry, sets: sets };
          } else {
            return progressEntry;
          }
        }),
      };
    } else {
      return progress;
    }
  }

  export function updateWeightInExercise(progress: IHistoryRecord, value?: IWeight): IHistoryRecord {
    if (progress.ui?.amrapModal != null) {
      const { entryIndex, setIndex } = progress.ui.amrapModal;
      return {
        ...progress,
        entries: progress.entries.map((progressEntry, i) => {
          if (i === entryIndex) {
            const sets = [...progressEntry.sets];
            const set = sets[setIndex];
            if (value != null) {
              sets[setIndex] = { ...set, weight: value };
            }
            return { ...progressEntry, sets: sets };
          } else {
            return progressEntry;
          }
        }),
      };
    } else {
      return progress;
    }
  }

  export function updateWeight(
    progress: IHistoryRecord,
    settings: ISettings,
    weight?: IWeight,
    programExercise?: IPlannerProgramExercise
  ): IHistoryRecord {
    const warmupSets = programExercise ? PlannerProgramExercise.programWarmups(programExercise, settings) : undefined;
    if (weight != null && progress.ui?.weightModal != null) {
      const { exercise, weight: previousWeight } = progress.ui.weightModal;

      return {
        ...progress,
        ui: { ...progress.ui, weightModal: undefined },
        entries: progress.entries.map((progressEntry) => {
          if (Exercise.eq(progressEntry.exercise, exercise)) {
            const firstWeight = progressEntry.sets[0]?.weight;
            return {
              ...progressEntry,
              sets: progressEntry.sets.map((set) => {
                if (Weight.eq(set.weight, previousWeight) && weight != null) {
                  return { ...set, weight };
                } else {
                  return set;
                }
              }),
              warmupSets:
                Weight.eq(firstWeight, previousWeight) && weight != null
                  ? Exercise.getWarmupSets(exercise, weight, settings, warmupSets)
                  : progressEntry.warmupSets,
            };
          } else {
            return progressEntry;
          }
        }),
      };
    } else {
      return { ...progress, ui: { ...progress.ui, weightModal: undefined } };
    }
  }

  export function updateUserPromptedStateVars(
    progress: IHistoryRecord,
    programExerciseId: string,
    userPromptedStateVars: IProgramState
  ): IHistoryRecord {
    return {
      ...progress,
      userPromptedStateVars: {
        ...(progress.userPromptedStateVars || {}),
        [programExerciseId]: userPromptedStateVars,
      },
    };
  }

  export function editDayAction(dispatch: IDispatch, programId: string, dayIndex: number): void {
    updateState(dispatch, [
      lb<IState>().p("editProgram").record({ id: programId, dayIndex: dayIndex }),
      lb<IState>()
        .p("screenStack")
        .recordModify((s) => Screen.push(s, "editProgramDay")),
    ]);
  }

  export function editExerciseNotes(dispatch: IDispatch, progressId: number, entryIndex: number, notes: string): void {
    updateState(dispatch, [
      lb<IState>().p("progress").pi(progressId).p("entries").i(entryIndex).p("notes").record(notes),
    ]);
  }

  export function showAddExerciseModal(dispatch: IDispatch, progressId: number): void {
    updateState(dispatch, [lb<IState>().p("progress").pi(progressId).pi("ui").p("exerciseModal").record({})]);
  }

  export function addExercise(dispatch: IDispatch, progressId: number, exerciseType: IExerciseType): void {
    updateState(dispatch, [
      lb<IState>()
        .p("progress")
        .pi(progressId)
        .p("entries")
        .recordModify((entries) => {
          return [...entries, History.createCustomEntry(exerciseType)];
        }),
    ]);
  }

  export function changeExercise(
    dispatch: IDispatch,
    progressId: number,
    exerciseType: IExerciseType,
    entryIndex: number
  ): void {
    updateState(dispatch, [
      lb<IState>()
        .p("progress")
        .pi(progressId)
        .p("entries")
        .i(entryIndex)
        .recordModify((entry) => {
          return { ...entry, exercise: exerciseType, changed: true };
        }),
    ]);
  }

  export function changeEquipment(
    dispatch: IDispatch,
    progressId: number,
    entryIndex: number,
    equipment: IEquipment
  ): void {
    updateState(dispatch, [
      lb<IState>()
        .p("progress")
        .pi(progressId)
        .p("entries")
        .i(entryIndex)
        .p("exercise")
        .p("equipment")
        .record(equipment),
    ]);
  }

  export function editNotes(dispatch: IDispatch, progressId: number, notes: string): void {
    updateState(dispatch, [lb<IState>().p("progress").pi(progressId).p("notes").record(notes)]);
  }

  export function getDayData(progress: IHistoryRecord): IDayData {
    return {
      day: progress.day,
      week: progress.week,
      dayInWeek: progress.dayInWeek,
    };
  }

  export function applyProgramExercise(
    progressEntry: IHistoryEntry | undefined,
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[],
    dayData: IDayData,
    settings: ISettings,
    forceWarmupSets?: boolean,
    staticState?: IProgramState
  ): IHistoryEntry {
    const state = { ...ProgramExercise.getState(programExercise, allProgramExercises), ...staticState };
    const variationIndex = Program.nextVariationIndex(programExercise, allProgramExercises, state, dayData, settings);
    const sets = ProgramExercise.getVariations(programExercise, allProgramExercises)[variationIndex].sets;
    const programExerciseWarmupSets = ProgramExercise.getWarmupSets(programExercise, allProgramExercises);

    const firstWeightExpr = sets[0]?.weightExpr;
    const firstWeight =
      firstWeightExpr != null
        ? executeEntryScript(
            firstWeightExpr,
            programExercise.exerciseType,
            dayData,
            state,
            { exerciseType: programExercise.exerciseType, unit: settings.units, prints: [] },
            settings,
            "weight"
          )
        : undefined;

    if (progressEntry != null) {
      const newSetsNum = Math.max(progressEntry.sets.length, sets.length);
      const newSets: ISet[] = [];
      for (let i = 0; i < newSetsNum; i++) {
        const progressSet: ISet | undefined = progressEntry.sets[i] as ISet | undefined;
        const programSet = sets[i];
        if (progressSet?.completedReps != null) {
          newSets.push(progressSet);
        } else if (programSet != null) {
          const weight = executeEntryScript(
            programSet.weightExpr,
            programExercise.exerciseType,
            dayData,
            state,
            { exerciseType: programExercise.exerciseType, unit: settings.units, prints: [] },
            settings,
            "weight"
          );
          const unit = Equipment.getUnitOrDefaultForExerciseType(settings, programExercise.exerciseType);
          const roundedWeight = Weight.roundConvertTo(weight, settings, unit, programExercise.exerciseType);
          newSets.push({
            ...progressSet,
            reps: executeEntryScript(
              programSet.repsExpr,
              programExercise.exerciseType,
              dayData,
              state,
              { exerciseType: programExercise.exerciseType, unit: settings.units, prints: [] },
              settings,
              "reps"
            ),
            minReps: programSet.minRepsExpr
              ? executeEntryScript(
                  programSet.minRepsExpr,
                  programExercise.exerciseType,
                  dayData,
                  state,
                  { exerciseType: programExercise.exerciseType, unit: settings.units, prints: [] },
                  settings,
                  "reps"
                )
              : undefined,
            rpe: programSet.rpeExpr
              ? executeEntryScript(
                  programSet.rpeExpr,
                  programExercise.exerciseType,
                  dayData,
                  state,
                  { exerciseType: programExercise.exerciseType, unit: settings.units, prints: [] },
                  settings,
                  "rpe"
                )
              : undefined,
            originalWeight: weight,
            weight: roundedWeight,
            isAmrap: programSet.isAmrap,
            logRpe: programSet.logRpe,
            label: programSet.label,
          });
        }
      }
      forceWarmupSets = forceWarmupSets || Reps.isEmpty(newSets);

      return {
        ...progressEntry,
        exercise: progressEntry.changed ? progressEntry.exercise : programExercise.exerciseType,
        warmupSets: forceWarmupSets
          ? firstWeight != null
            ? Exercise.getWarmupSets(programExercise.exerciseType, firstWeight, settings, programExerciseWarmupSets)
            : []
          : progressEntry.warmupSets,
        sets: newSets,
      };
    } else {
      return {
        exercise: programExercise.exerciseType,
        programExerciseId: programExercise.id,
        sets: sets.map((set) => {
          const weight = executeEntryScript(
            set.weightExpr,
            programExercise.exerciseType,
            dayData,
            state,
            { exerciseType: programExercise.exerciseType, unit: settings.units, prints: [] },
            settings,
            "weight"
          );
          const unit = Equipment.getUnitOrDefaultForExerciseType(settings, programExercise.exerciseType);
          const roundedWeight = Weight.roundConvertTo(weight, settings, unit, programExercise.exerciseType);
          return {
            reps: executeEntryScript(
              set.repsExpr,
              programExercise.exerciseType,
              dayData,
              state,
              { exerciseType: programExercise.exerciseType, unit: settings.units, prints: [] },
              settings,
              "reps"
            ),
            minReps: set.minRepsExpr
              ? executeEntryScript(
                  set.minRepsExpr,
                  programExercise.exerciseType,
                  dayData,
                  state,
                  { exerciseType: programExercise.exerciseType, unit: settings.units, prints: [] },
                  settings,
                  "reps"
                )
              : undefined,
            originalWeight: weight,
            weight: roundedWeight,
            rpe: set.rpeExpr
              ? executeEntryScript(
                  set.rpeExpr,
                  programExercise.exerciseType,
                  dayData,
                  state,
                  { exerciseType: programExercise.exerciseType, unit: settings.units, prints: [] },
                  settings,
                  "rpe"
                )
              : undefined,
            logRpe: set.logRpe,
            isAmrap: set.isAmrap,
            label: set.label,
          };
        }),
        warmupSets:
          firstWeight != null
            ? Exercise.getWarmupSets(programExercise.exerciseType, firstWeight, settings, programExerciseWarmupSets)
            : [],
      };
    }
  }

  export function applyProgramDay(
    progress: IHistoryRecord,
    program: IEvaluatedProgram,
    dayIndex: number,
    settings: ISettings,
    staticStates?: Partial<Record<string, IProgramState>>,
    programExerciseIds?: string[],
    checkReused?: boolean
  ): IHistoryRecord {
    program = Program.fullProgram(program, settings);
    const programDay = Program.getProgramDay(program, dayIndex);
    const affectedProgramExerciseIds = programExerciseIds
      ? checkReused
        ? CollectionUtils.flat(
            programExerciseIds.map((id) => {
              const reusingExerciseIds = program.exercises
                .filter((e) => e.reuseLogic?.selected === id)
                .map((e) => e.id);
              return [id].concat(reusingExerciseIds);
            })
          )
        : programExerciseIds
      : undefined;

    const newEntries = progress.entries
      .filter(
        (e) =>
          !e.programExerciseId ||
          (programDay.exercises.some((ex) => ex.id === e.programExerciseId) &&
            !(progress.deletedProgramExercises || {})[e.programExerciseId])
      )
      .map((progressEntry) => {
        const programExerciseId = progressEntry.programExerciseId;
        if (programExerciseId == null) {
          return progressEntry;
        }
        if (affectedProgramExerciseIds && affectedProgramExerciseIds.indexOf(programExerciseId) === -1) {
          return progressEntry;
        }
        const programExercise = program.exercises.find((e) => e.id === programExerciseId);
        if (programExercise == null) {
          return progressEntry;
        }
        const staticState = staticStates?.[programExerciseId];
        return applyProgramExercise(
          progressEntry,
          programExercise,
          program.exercises,
          Progress.getDayData(progress),
          settings,
          false,
          staticState
        );
      });

    const sortedNewEntries = CollectionUtils.sortInOrder(
      newEntries,
      "programExerciseId",
      programDay.exercises.map((e) => e.id)
    );

    const newProgramExercises = programDay.exercises.filter(
      (e) => !progress.entries.some((ent) => ent.programExerciseId === e.id)
    );
    const additionalEntries =
      programExerciseIds == null
        ? CollectionUtils.compact(
            newProgramExercises.map((programDayExercise) => {
              const programExercise = program.exercises.find((e) => e.id === programDayExercise.id);
              if (!programExercise) {
                return undefined;
              }
              const staticState = staticStates?.[programExercise.id];
              return applyProgramExercise(
                undefined,
                programExercise,
                program.exercises,
                Progress.getDayData(progress),
                settings,
                false,
                staticState
              );
            })
          )
        : [];

    return {
      ...progress,
      entries: [...sortedNewEntries, ...additionalEntries],
    };
  }

  export function executeEntryScript(
    expr: string,
    exerciseType: IExerciseType,
    dayData: IDayData,
    state: IProgramState,
    context: IScriptFnContext,
    settings: ISettings,
    type: "weight"
  ): IWeight;
  export function executeEntryScript(
    expr: string,
    exerciseType: IExerciseType,
    dayData: IDayData,
    state: IProgramState,
    context: IScriptFnContext,
    settings: ISettings,
    type: "reps" | "rpe"
  ): number;
  export function executeEntryScript(
    expr: string,
    exerciseType: IExerciseType,
    dayData: IDayData,
    state: IProgramState,
    context: IScriptFnContext,
    settings: ISettings,
    type: "timer"
  ): number;
  export function executeEntryScript(
    expr: string,
    exerciseType: IExerciseType,
    dayData: IDayData,
    state: IProgramState,
    context: IScriptFnContext,
    settings: ISettings,
    type: "reps" | "weight" | "timer" | "rpe"
  ): IWeight | IPercentage | number | undefined {
    const runner = new ScriptRunner(
      expr,
      state,
      {},
      createEmptyScriptBindings(dayData, settings, exerciseType),
      createScriptFunctions(settings),
      settings.units,
      context,
      "regular"
    );
    if (type === "reps") {
      return ScriptRunner.safe(
        () => runner.execute(type),
        (e) =>
          `There's an error while calculating reps via expression: ${expr}:\n\n${e.message}.\n\nWe fallback to the default reps 5. Please fix the exercise's reps script.`,
        5
      );
    } else if (type === "timer") {
      return ScriptRunner.safe(
        () => runner.execute(type),
        (e) =>
          `There's an error while calculating timer script via expression: ${expr}:\n\n${e.message}.\n\nWe fallback to the default timer. Please fix the exercise's timer script.`,
        undefined
      );
    } else if (type === "rpe") {
      return ScriptRunner.safe(
        () => runner.execute(type),
        (e) =>
          `There's an error while calculating RPE script via expression: ${expr}:\n\n${e.message}.\n\nWe ignore the RPE value. Please fix the exercise's RPE script.`,
        undefined
      );
    } else {
      return ScriptRunner.safe(
        () => {
          let weight = runner.execute(type);
          if (Weight.isPct(weight)) {
            const onerm = Exercise.onerm(exerciseType, settings);
            weight = Weight.multiply(onerm, MathUtils.roundFloat(weight.value / 100, 4));
          }
          return weight;
        },
        (e) =>
          `There's an error while executing script ${expr}:\n\n${e.message}.\n\nWe fallback to 100. Please fix the exercise's script.`,
        Weight.build(100, settings.units)
      );
    }
  }
}
