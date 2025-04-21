/* eslint-disable @typescript-eslint/unified-signatures */
import { Exercise } from "./exercise";
import { Reps } from "./set";
import { Weight } from "./weight";
import { DateUtils } from "../utils/date";
import { lf, lb } from "lens-shmens";
import { ObjectUtils } from "../utils/object";
import { IDispatch } from "../ducks/types";
import { ScriptRunner } from "../parser";

import { IEvaluatedProgram, Program } from "./program";
import { IState, updateProgress, updateState } from "./state";
import {
  IWeight,
  IHistoryEntry,
  ISettings,
  IHistoryRecord,
  IProgressMode,
  IExerciseType,
  IProgressUi,
  IProgramState,
  IEquipment,
  ISubscription,
  ISet,
  IDayData,
  IExerciseDataValue,
  IUnit,
} from "../types";
import { SendMessage } from "../utils/sendMessage";
import { Subscriptions } from "../utils/subscriptions";
import { IPercentage } from "../types";
import { History } from "./history";
import { CollectionUtils } from "../utils/collection";
import { ILiftoscriptEvaluatorUpdate } from "../liftoscriptEvaluator";
import { Equipment } from "./equipment";
import { IByTag } from "../pages/planner/plannerEvaluator";
import { IPlannerProgramExercise, IPlannerProgramExerciseUsed } from "../pages/planner/models/types";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import { IScreenStack, Screen } from "./screen";
import { UidFactory } from "../utils/generator";

export interface IScriptBindings {
  day: number;
  week: number;
  dayInWeek: number;
  originalWeights: (IWeight | IPercentage)[];
  weights: (IWeight | undefined)[];
  completedWeights: (IWeight | undefined)[];
  rm1: IWeight;
  reps: (number | undefined)[];
  minReps: (number | undefined)[];
  amraps: (number | undefined)[];
  logrpes: (number | undefined)[];
  timers: (number | undefined)[];
  RPE: (number | undefined)[];
  completedRPE: (number | undefined)[];
  completedReps: (number | undefined)[];
  isCompleted: (0 | 1)[];
  w: (IWeight | undefined)[];
  r: (number | undefined)[];
  mr: (number | undefined)[];
  cr: (number | undefined)[];
  cw: (IWeight | undefined)[];
  ns: number;
  programNumberOfSets: number;
  numberOfSets: number;
  completedNumberOfSets: number;
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
  print(...args: unknown[]): (typeof args)[0];
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
      completedWeights: [],
      originalWeights: [],
      weights: [],
      reps: [],
      minReps: [],
      RPE: [],
      amraps: [],
      logrpes: [],
      completedReps: [],
      completedRPE: [],
      isCompleted: [],
      timers: [],
      w: [],
      r: [],
      cr: [],
      cw: [],
      mr: [],
      programNumberOfSets: 0,
      numberOfSets: 0,
      completedNumberOfSets: 0,
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
    programNumberOfSets: number,
    setIndex?: number,
    setVariationIndex?: number,
    descriptionIndex?: number
  ): IScriptBindings {
    const bindings = createEmptyScriptBindings(dayData, settings, entry.exercise);
    for (const set of entry.sets) {
      bindings.weights.push(set.weight);
      bindings.originalWeights.push(set.originalWeight ?? Weight.build(0, settings.units));
      bindings.reps.push(set.reps);
      bindings.minReps.push(set.minReps);
      bindings.completedReps.push(set.completedReps);
      bindings.completedRPE.push(set.completedRpe);
      bindings.completedWeights.push(set.completedWeight);
      bindings.RPE.push(set.rpe);
      bindings.amraps.push(set.isAmrap ? 1 : undefined);
      bindings.logrpes.push(set.logRpe ? 1 : undefined);
      bindings.timers.push(set.timer);
      bindings.isCompleted.push(set.isCompleted ? 1 : 0);
    }
    bindings.w = bindings.weights;
    bindings.r = bindings.reps;
    bindings.cr = bindings.completedReps;
    bindings.cw = bindings.completedWeights;
    bindings.mr = bindings.minReps;
    bindings.ns = entry.sets.length;
    bindings.programNumberOfSets = programNumberOfSets;
    bindings.numberOfSets = entry.sets.length;
    bindings.completedNumberOfSets = entry.sets.filter((s) => s.isCompleted).length;
    bindings.setIndex = setIndex ?? 1;
    bindings.setVariationIndex = setVariationIndex ?? 1;
    bindings.descriptionIndex = descriptionIndex ?? 1;
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

  export function startTimer(
    progress: IHistoryRecord,
    timestamp: number,
    mode: IProgressMode,
    entryIndex: number,
    setIndex: number,
    settings: ISettings,
    subscription?: ISubscription,
    timer?: number
  ): IHistoryRecord {
    const set =
      mode === "warmup"
        ? progress.entries[entryIndex]?.warmupSets[setIndex]
        : progress.entries[entryIndex]?.sets[setIndex];
    if (!set || !set.isCompleted) {
      return progress;
    }
    if (timer == null && Progress.isCurrent(progress) && mode === "workout") {
      timer = progress.entries[entryIndex]?.sets[setIndex]?.timer;
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
    if (subscription && Subscriptions.hasSubscription(subscription)) {
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
          subtitleHeader = "Next Set";
          subtitle = CollectionUtils.compact([
            exercise.name,
            set.reps != null ? `${set.reps}${set.isAmrap ? "+" : ""} reps` : undefined,
            set.weight != null ? Weight.display(set.weight) : undefined,
          ]).join(", ");
          if (set.weight != null) {
            const { plates } = Weight.calculatePlates(set.weight, settings, set.weight.unit, entry.exercise);
            const formattedPlates = plates.length > 0 ? Weight.formatOneSide(settings, plates, exercise) : "None";
            bodyHeader = "Plates per side";
            body = formattedPlates;
          }
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
    return entry.sets.filter((s) => !s.isCompleted).length === 1;
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

  export function getProgressId(screenStack: IScreenStack): number {
    const currentScreen = Screen.current(screenStack);
    if (currentScreen.name === "progress") {
      return currentScreen.params?.id ?? 0;
    }
    return 0;
  }

  export function getProgress(state: Pick<IState, "screenStack" | "progress">): IHistoryRecord | undefined {
    return state.progress[getProgressId(state.screenStack)];
  }

  export function setProgress(state: IState, progress: IHistoryRecord): IState {
    return lf(state).p("progress").p(getProgressId(state.screenStack)).set(progress);
  }

  export function runUpdateScriptForEntry(
    entry: IHistoryEntry,
    dayData: IDayData,
    programExercise: IPlannerProgramExercise,
    otherStates: IByTag<IProgramState>,
    setIndex: number,
    settings: ISettings
  ): IHistoryEntry {
    if (setIndex !== -1 && !entry?.sets[setIndex]?.isCompleted) {
      return entry;
    }
    const script = PlannerProgramExercise.getUpdateScript(programExercise);
    if (!script) {
      return entry;
    }
    const exercise = programExercise.exerciseType;
    const state = ObjectUtils.clone(PlannerProgramExercise.getState(programExercise));
    const setVariationIndex = PlannerProgramExercise.currentEvaluatedSetVariationIndex(programExercise);
    const descriptionIndex = PlannerProgramExercise.currentDescriptionIndex(programExercise);
    const bindings = Progress.createScriptBindings(
      dayData,
      entry,
      settings,
      programExercise.evaluatedSetVariations[setVariationIndex]?.sets.length ?? 0,
      setIndex + 1,
      setVariationIndex,
      descriptionIndex
    );
    try {
      const fnContext: IScriptFnContext = { exerciseType: exercise, unit: settings.units, prints: [] };
      const runner = new ScriptRunner(
        script,
        state,
        ObjectUtils.clone(otherStates),
        bindings,
        Progress.createScriptFunctions(settings),
        settings.units,
        fnContext,
        "update"
      );
      runner.execute();
      const newEntry = Progress.applyBindings(entry, bindings);
      newEntry.state = { ...newEntry.state, ...state };
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
  }

  export function runInitialUpdateScripts(
    aProgress: IHistoryRecord,
    programExerciseIds: string[] | undefined,
    day: number,
    program: IEvaluatedProgram,
    settings: ISettings
  ): IHistoryRecord {
    const programDay = Program.getProgramDay(program, day);
    if (!programDay) {
      return aProgress;
    }
    const dayExercises = Program.getProgramDayExercises(programDay);
    const programExercises = programExerciseIds
      ? CollectionUtils.compact(programExerciseIds.map((id) => dayExercises.find((e) => e.key === id)))
      : dayExercises;

    return {
      ...aProgress,
      entries: aProgress.entries.map((entry) => {
        const programExercise =
          entry.programExerciseId != null ? programExercises.find((e) => e.key === entry.programExerciseId) : undefined;
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
    otherStates: IByTag<IProgramState>,
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
    entry.sets = entry.sets.slice(0, Math.max(lastCompletedIndex, bindings.numberOfSets, 0));
    for (const key of keys) {
      for (let i = 0; i < bindings[key].length; i += 1) {
        if (entry.sets[i] == null) {
          entry.sets[i] = {
            id: UidFactory.generateUid(6),
            reps: 0,
            weight: Weight.build(0, "lb"),
            originalWeight: Weight.build(0, "lb"),
            askWeight: false,
            isCompleted: false,
          };
        }
        if (!entry.sets[i].isCompleted) {
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

  export function completeAmrapSet(progress: IHistoryRecord, entryIndex: number, setIndex: number): IHistoryRecord {
    return lf(progress)
      .p("entries")
      .i(entryIndex)
      .p("sets")
      .i(setIndex)
      .modify((progressSet) => {
        return {
          ...progressSet,
          timestamp: !progressSet.isCompleted ? Date.now() : progressSet.timestamp,
          completedReps: progressSet.completedReps ?? progressSet.reps,
          completedWeight: progressSet.completedWeight ?? progressSet.weight,
          isCompleted: !progressSet.isCompleted,
        };
      });
  }

  export function completeSet(
    progress: IHistoryRecord,
    entryIndex: number,
    setIndex: number,
    mode: IProgressMode,
    hasUserPromptedVars: boolean
  ): IHistoryRecord {
    const entry = progress.entries[entryIndex];
    const set = mode === "warmup" ? entry.warmupSets[setIndex] : entry.sets[setIndex];
    const shouldLogRpe = !!set?.logRpe;
    const shouldPromptUserVars = hasUserPromptedVars && Progress.hasLastUnfinishedSet(entry);
    const isAmrap = set?.completedReps == null && (!!set?.isAmrap || set.reps == null);
    const shouldAskWeight = set?.completedWeight == null && (!!set?.askWeight || set.weight == null);
    if (mode === "warmup") {
      return lf(progress)
        .p("entries")
        .i(entryIndex)
        .p("warmupSets")
        .i(setIndex)
        .modify((progressSet) => {
          return {
            ...progressSet,
            timestamp: !progressSet.isCompleted ? Date.now() : progressSet.timestamp,
            completedReps: progressSet.completedReps ?? progressSet.reps,
            completedWeight: progressSet.completedWeight ?? progressSet.weight,
            isCompleted: !progressSet.isCompleted,
          };
        });
    } else if (!set.isCompleted && (shouldLogRpe || shouldPromptUserVars || isAmrap || shouldAskWeight)) {
      const amrapUi: IProgressUi = {
        amrapModal: {
          entryIndex,
          setIndex,
          logRpe: shouldLogRpe,
          userVars: shouldPromptUserVars,
          isAmrap: isAmrap,
          askWeight: shouldAskWeight,
        },
      };
      return { ...progress, ui: { ...progress.ui, ...amrapUi } };
    } else {
      return completeAmrapSet(progress, entryIndex, setIndex);
    }
  }

  export function getIsRpeEnabled(sets: ISet[]): boolean {
    return sets.some((set) => set.rpe != null);
  }

  export function getIsMinRepsEnabled(sets: ISet[]): boolean {
    return sets.some((set) => set.minReps != null);
  }

  export function updateAmrapRepsInExercise(progress: IHistoryRecord, value?: number): IHistoryRecord {
    if (progress.ui?.amrapModal != null) {
      const { entryIndex, setIndex } = progress.ui.amrapModal;
      return lf(progress).p("entries").i(entryIndex).p("sets").i(setIndex).p("completedReps").set(value);
    } else {
      return progress;
    }
  }

  export function updateRpeInExercise(progress: IHistoryRecord, value?: number): IHistoryRecord {
    if (progress.ui?.amrapModal != null) {
      const { entryIndex, setIndex } = progress.ui.amrapModal;
      const newValue = value != null ? Math.round(Math.min(10, Math.max(0, value)) / 0.5) * 0.5 : undefined;
      return lf(progress).p("entries").i(entryIndex).p("sets").i(setIndex).p("completedRpe").set(newValue);
    } else {
      return progress;
    }
  }

  export function updateWeightInExercise(progress: IHistoryRecord, value?: IWeight): IHistoryRecord {
    if (progress.ui?.amrapModal != null) {
      const { entryIndex, setIndex } = progress.ui.amrapModal;
      return lf(progress).p("entries").i(entryIndex).p("sets").i(setIndex).p("completedWeight").set(value);
    } else {
      return progress;
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

  export function editExerciseNotes(dispatch: IDispatch, entryIndex: number, notes: string): void {
    updateProgress(dispatch, [lb<IHistoryRecord>().p("entries").i(entryIndex).p("notes").record(notes)], "edit-notes");
  }

  export function showAddExerciseModal(dispatch: IDispatch, progressId: number): void {
    updateState(dispatch, [lb<IState>().p("progress").pi(progressId).pi("ui").p("exerciseModal").record({})]);
  }

  export function addExercise(dispatch: IDispatch, exerciseType: IExerciseType, numberOfEntries: number): void {
    updateProgress(
      dispatch,
      [
        lb<IHistoryRecord>()
          .p("entries")
          .recordModify((entries) => {
            return [...entries, History.createCustomEntry(exerciseType)];
          }),
      ],
      "add-exercise"
    );
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
    programExercise: IPlannerProgramExerciseUsed,
    settings: ISettings,
    forceWarmupSets?: boolean
  ): IHistoryEntry {
    const variationIndex = PlannerProgramExercise.currentSetVariationIndex(programExercise);
    const sets = programExercise.evaluatedSetVariations[variationIndex].sets;
    const programExerciseWarmupSets = PlannerProgramExercise.programWarmups(programExercise, settings);

    if (progressEntry != null) {
      const newSetsNum = Math.max(progressEntry.sets.length, sets.length);
      const newSets: ISet[] = [];
      for (let i = 0; i < newSetsNum; i++) {
        const progressSet: ISet | undefined = progressEntry.sets[i] as ISet | undefined;
        const programSet = sets[i];
        if (!!progressSet?.isCompleted) {
          newSets.push(progressSet);
        } else if (programSet != null) {
          const unit = Equipment.getUnitOrDefaultForExerciseType(settings, programExercise.exerciseType);
          const originalWeight = programSet.weight;
          const evaluatedWeight = originalWeight
            ? Weight.evaluateWeight(originalWeight, programExercise.exerciseType, settings)
            : undefined;
          const weight = evaluatedWeight
            ? Weight.roundConvertTo(evaluatedWeight, settings, unit, programExercise.exerciseType)
            : undefined;
          newSets.push({
            ...progressSet,
            reps: programSet.maxrep,
            minReps: programSet.minrep,
            rpe: programSet.rpe,
            originalWeight,
            weight,
            isAmrap: programSet.isAmrap,
            logRpe: programSet.logRpe,
            label: programSet.label,
          });
        }
      }
      forceWarmupSets = forceWarmupSets || Reps.isEmpty(newSets);

      const firstWeight = newSets[0]?.weight;
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
      const newSets = sets.map((set) => {
        const unit = Equipment.getUnitOrDefaultForExerciseType(settings, programExercise.exerciseType);
        const originalWeight = set.weight
          ? Weight.evaluateWeight(set.weight, programExercise.exerciseType, settings)
          : undefined;
        const weight = originalWeight
          ? Weight.roundConvertTo(originalWeight, settings, unit, programExercise.exerciseType)
          : undefined;
        return {
          reps: set.maxrep,
          minReps: set.minrep,
          originalWeight,
          weight,
          rpe: set.rpe,
          logRpe: set.logRpe,
          isAmrap: set.isAmrap,
          label: set.label,
        };
      });
      const firstWeight = newSets[0]?.weight;

      return {
        exercise: programExercise.exerciseType,
        programExerciseId: programExercise.key,
        sets: newSets,
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
    day: number,
    settings: ISettings,
    programExerciseIds?: string[]
  ): IHistoryRecord {
    const programDay = Program.getProgramDay(program, day);
    if (!programDay) {
      return progress;
    }
    const dayExercises = Program.getProgramDayExercises(programDay);
    const wasResorted = !!progress.changes?.includes("order");
    const newEntries = progress.entries
      .filter(
        (e) =>
          !e.programExerciseId ||
          (dayExercises.some((ex) => ex.key === e.programExerciseId) &&
            !(progress.deletedProgramExercises || {})[e.programExerciseId])
      )
      .map((progressEntry) => {
        const programExerciseId = progressEntry.programExerciseId;
        if (programExerciseId == null) {
          return progressEntry;
        }
        if (programExerciseIds && programExerciseIds.indexOf(programExerciseId) === -1) {
          return progressEntry;
        }
        const programExercise = dayExercises.find((e) => e.key === programExerciseId);
        if (programExercise == null) {
          return progressEntry;
        }
        return applyProgramExercise(progressEntry, programExercise, settings, false);
      });

    const sortedNewEntries = wasResorted
      ? newEntries
      : CollectionUtils.sortInOrder(
          newEntries,
          "programExerciseId",
          dayExercises.map((e) => e.key)
        );

    const newProgramExercises = dayExercises.filter(
      (e) => !progress.entries.some((ent) => ent.programExerciseId === e.key)
    );
    const additionalEntries =
      programExerciseIds == null
        ? CollectionUtils.compact(
            newProgramExercises.map((programDayExercise) => {
              const programExercise = dayExercises.find((e) => e.key === programDayExercise.key);
              if (!programExercise) {
                return undefined;
              }
              return applyProgramExercise(undefined, programExercise, settings, false);
            })
          )
        : [];

    return {
      ...progress,
      entries: [...sortedNewEntries, ...additionalEntries],
    };
  }
}
