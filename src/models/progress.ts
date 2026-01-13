import { Exercise } from "./exercise";
import { Reps } from "./set";
import { Weight } from "./weight";
import { DateUtils } from "../utils/date";
import { lf, lb, LensBuilder } from "lens-shmens";
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
  IStats,
  IProgram,
} from "../types";
import { SendMessage } from "../utils/sendMessage";
import { Subscriptions } from "../utils/subscriptions";
import { IPercentage } from "../types";
import { History } from "./history";
import { CollectionUtils } from "../utils/collection";
import { ILiftoscriptEvaluatorUpdate } from "../liftoscriptEvaluator";
import { Equipment } from "./equipment";
import { IByTag } from "../pages/planner/plannerEvaluator";
import { IPlannerProgramExercise, IPlannerProgramExerciseWithType } from "../pages/planner/models/types";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import { IScreenStack, Screen } from "./screen";
import { UidFactory } from "../utils/generator";
import { ProgramSet } from "./programSet";
import { Stats } from "./stats";
import { IChangeAMRAPAction, ICompleteSetAction } from "../ducks/reducer";
import { LiveActivityManager } from "../utils/liveActivityManager";
import { ProgramExercise } from "./programExercise";

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
  askweights: (number | undefined)[];
  logrpes: (number | undefined)[];
  timers: (number | undefined)[];
  RPE: (number | undefined)[];
  completedRPE: (number | undefined)[];
  completedReps: (number | undefined)[];
  completedRepsLeft: (number | undefined)[];
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
  bodyweight: IWeight;
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
  roundConvertWeight: (num: IWeight, context: IScriptFnContext) => IWeight;
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
  increment(val: IWeight, context: IScriptFnContext): IWeight;
  increment(val: IPercentage, context: IScriptFnContext): IPercentage;
  increment(val: number, context: IScriptFnContext): number;
  decrement(val: IWeight, context: IScriptFnContext): IWeight;
  decrement(val: IPercentage, context: IScriptFnContext): IPercentage;
  decrement(val: number, context: IScriptFnContext): number;
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
      askweights: [],
      completedReps: [],
      completedRepsLeft: [],
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
      bodyweight: Weight.build(0, settings.units),
      setIndex: 1,
      rm1,
    };
  }

  export function createScriptBindings(
    dayData: IDayData,
    entry: IHistoryEntry,
    settings: ISettings,
    programNumberOfSets: number,
    bodyweight: IWeight | undefined,
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
      bindings.completedRepsLeft.push(set.completedRepsLeft);
      bindings.completedRPE.push(set.completedRpe);
      bindings.completedWeights.push(set.completedWeight);
      bindings.RPE.push(set.rpe);
      bindings.amraps.push(set.isAmrap ? 1 : undefined);
      bindings.logrpes.push(set.logRpe ? 1 : undefined);
      bindings.askweights.push(set.askWeight ? 1 : undefined);
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
    bindings.bodyweight = bodyweight ?? Weight.build(0, settings.units);
    return bindings;
  }

  export function createScriptFunctions(settings: ISettings): IScriptFunctions {
    function increment(vals: number, context: IScriptFnContext): number;
    function increment(vals: IWeight, context: IScriptFnContext): IWeight;
    function increment(vals: IPercentage, context: IScriptFnContext): IPercentage;
    function increment(
      vals: IWeight | IPercentage | number,
      context: IScriptFnContext
    ): IWeight | IPercentage | number {
      if (typeof vals === "number") {
        const weight = Weight.build(vals, context.unit);
        return Weight.increment(weight, settings, context.exerciseType);
      } else if (Weight.isPct(vals)) {
        return Weight.buildPct(vals.value + 1);
      } else {
        return Weight.increment(vals, settings, context.exerciseType);
      }
    }

    function decrement(vals: number, context: IScriptFnContext): number;
    function decrement(vals: IWeight, context: IScriptFnContext): IWeight;
    function decrement(vals: IPercentage, context: IScriptFnContext): IPercentage;
    function decrement(
      vals: IWeight | IPercentage | number,
      context: IScriptFnContext
    ): IWeight | IPercentage | number {
      if (typeof vals === "number") {
        const weight = Weight.build(vals, context.unit);
        return Weight.decrement(weight, settings, context.exerciseType);
      } else if (Weight.isPct(vals)) {
        return Weight.buildPct(vals.value - 1);
      } else {
        return Weight.decrement(vals, settings, context.exerciseType);
      }
    }

    const fns: IScriptFunctions = {
      roundWeight: (num, context) => {
        if (!Weight.is(num)) {
          num = Weight.build(num, settings.units);
        }
        const unit = Equipment.getUnitForExerciseType(settings, context?.exerciseType);
        return Weight.round(num, settings, unit ?? settings.units, context?.exerciseType);
      },
      roundConvertWeight: (num, context) => {
        if (!Weight.is(num)) {
          num = Weight.build(num, settings.units);
        }
        const unit = Equipment.getUnitForExerciseType(settings, context?.exerciseType);
        return Weight.roundConvertTo(num, settings, unit ?? settings.units, context?.exerciseType);
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
      increment,
      decrement,
      zeroOrGte,
      print: (...fnArgs) => {
        fnArgs.pop();
        const context = fnArgs.pop() as IScriptFnContext;
        const args = [...fnArgs.flat()] as (number | IWeight | IPercentage)[];
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
    return fns;
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
    timer?: number,
    isAdjusting?: boolean
  ): IHistoryRecord {
    const entry = progress.entries[entryIndex];
    const set = mode === "warmup" ? entry?.warmupSets[setIndex] : entry?.sets[setIndex];
    if (!isAdjusting && (!set || !set.isCompleted)) {
      return progress;
    }
    if (timer == null && Progress.isCurrent(progress) && mode === "workout") {
      timer = entry?.sets[setIndex]?.timer;
    }
    if (timer == null) {
      timer =
        mode === "workout" && entry.superset != null && settings.timers.superset != null
          ? settings.timers.superset
          : settings.timers[mode] || undefined;
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
      const nextEntryAndSet = Reps.findNextEntryAndSet(progress, entryIndex, mode);
      if (nextEntryAndSet != null) {
        const { entry: nextEntry, set: aSet } = nextEntryAndSet;
        const exercise = Exercise.get(nextEntry.exercise, settings.exercises);
        if (exercise) {
          subtitleHeader = "Next Set";
          subtitle = CollectionUtils.compact([
            exercise.name,
            aSet.reps != null ? `${aSet.reps}${aSet.isAmrap ? "+" : ""} reps` : undefined,
            aSet.weight != null ? Weight.display(aSet.weight) : undefined,
          ]).join(", ");
          if (aSet.weight != null) {
            const { plates } = Weight.calculatePlates(aSet.weight, settings, aSet.weight.unit, nextEntry.exercise);
            const formattedPlates = plates.length > 0 ? Weight.formatOneSide(settings, plates, exercise) : "None";
            bodyHeader = "Plates per side";
            body = formattedPlates;
          }
        }
      }
      const ignoreDoNotDisturb = settings.ignoreDoNotDisturb ? "true" : "false";
      const vibration = settings.vibration ? "true" : "false";
      const volume = settings.volume.toString();
      SendMessage.print(`Scheduling timer notification, volume: ${volume}`);
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
        vibration,
        volume,
      });
      SendMessage.toAndroid({
        type: "startTimer",
        duration: timerForPush.toString(),
        mode,
        title,
        subtitleHeader,
        subtitle,
        bodyHeader,
        body,
        ignoreDoNotDisturb,
        vibration,
        volume,
      });
    }
    const newProgress: IHistoryRecord = {
      ...progress,
      timerSince: timestamp,
      timer,
      timerMode: mode,
      timerEntryIndex: entryIndex,
      timerSetIndex: setIndex,
      ui: { ...progress.ui, nativeNotificationScheduled: undefined },
    };
    return newProgress;
  }

  export function getNextSupersetEntry(entries: IHistoryEntry[], entry: IHistoryEntry): IHistoryEntry | undefined {
    const superset: string | undefined = entry.superset;
    if (superset == null) {
      return undefined;
    }
    const supersetGroups = getSupersetGroups(entries);
    const supersetGroup: IHistoryEntry[] = supersetGroups?.[superset] ?? [];
    if (supersetGroup.length <= 1) {
      return undefined;
    }
    const supersetIndex = supersetGroup?.findIndex((e) => e.id === entry!.id);
    if (supersetIndex == null || supersetIndex < 0) {
      return undefined;
    }
    return supersetGroup[(supersetIndex + 1) % supersetGroup.length];
  }

  export function getNextEntry(
    progress: IHistoryRecord,
    entry: IHistoryEntry,
    mode: "workout" | "warmup",
    shouldGoToNextEntry: boolean
  ): IHistoryEntry | undefined {
    if (isFullyEmptyOrFinishedSet(progress)) {
      return undefined;
    }
    const visitedAndFinished = new Set<IHistoryEntry>();
    let currentEntry: IHistoryEntry | undefined = entry;
    let isInitial = true;
    const supersetGroups = getSupersetGroups(progress.entries);
    while (currentEntry != null) {
      let index = progress.entries.findIndex((e) => e.id != null && e.id === currentEntry?.id);
      if (index === -1) {
        index = progress.entries.findIndex((e) => e === currentEntry);
      }
      const superset: string | undefined = currentEntry.superset;
      if (mode === "workout" && superset != null && !visitedAndFinished.has(currentEntry)) {
        const supersetGroup: IHistoryEntry[] = supersetGroups?.[superset] ?? [];
        if (supersetGroup.length > 1) {
          const supersetIndex = supersetGroup?.findIndex((e) => e.id === currentEntry?.id);
          currentEntry = supersetGroup[(supersetIndex + 1) % supersetGroup.length];
        } else {
          if (shouldGoToNextEntry) {
            currentEntry = progress.entries[(index + 1) % progress.entries.length];
          } else {
            return currentEntry;
          }
        }
      } else if (Reps.isEmptyOrFinished(currentEntry.sets)) {
        if (shouldGoToNextEntry) {
          currentEntry = progress.entries[(index + 1) % progress.entries.length];
        } else {
          return undefined;
        }
      }
      if (currentEntry == null) {
        return undefined;
      }
      if (!Reps.isEmptyOrFinished(currentEntry.sets)) {
        return currentEntry;
      } else if (!isInitial) {
        visitedAndFinished.add(currentEntry);
      }
      isInitial = false;
    }
    return undefined;
  }

  export function getNextEntryIndex(
    progress: IHistoryRecord,
    entry: IHistoryEntry,
    mode: "workout" | "warmup"
  ): number | undefined {
    const nextEntry = getNextEntry(progress, entry, mode, false);
    if (nextEntry != null) {
      let index = progress.entries.findIndex((e) => e.id != null && e.id === nextEntry.id);
      if (index === -1) {
        index = progress.entries.findIndex((e) => e === nextEntry);
      }
      return index === -1 ? undefined : index;
    }
    return undefined;
  }

  export function updateTimer(
    progress: IHistoryRecord,
    program: IProgram,
    newTimer: number,
    timerSince: number,
    liveActivityEntryIndex: number | undefined,
    liveActivitySetIndex: number | undefined,
    skipLiveActivityUpdate: boolean,
    settings: ISettings,
    subscription: ISubscription | undefined
  ): IHistoryRecord {
    const timerForPush = newTimer - Math.round((Date.now() - timerSince) / 1000);
    if (timerForPush > 0) {
      const newProgress = Progress.startTimer(
        progress,
        progress.timerSince || Date.now(),
        progress.timerMode || "workout",
        progress.timerEntryIndex || 0,
        progress.timerSetIndex || 0,
        settings,
        subscription,
        newTimer,
        true
      );
      if (!skipLiveActivityUpdate) {
        LiveActivityManager.updateProgressLiveActivity(
          program,
          progress,
          settings,
          subscription,
          liveActivityEntryIndex,
          liveActivitySetIndex,
          newTimer,
          progress.timerSince || Date.now()
        );
      }
      return newProgress;
    } else {
      SendMessage.toIos({ type: "stopTimer" });
      SendMessage.toAndroid({ type: "stopTimer" });
      const newProgress = {
        ...progress,
        timer: Math.max(0, newTimer),
        ui: {
          ...progress.ui,
          nativeNotificationScheduled: undefined,
        },
      };
      if (!skipLiveActivityUpdate) {
        LiveActivityManager.updateProgressLiveActivity(
          program,
          progress,
          settings,
          subscription,
          liveActivityEntryIndex,
          liveActivitySetIndex,
          Math.max(0, newTimer),
          progress.timerSince || Date.now()
        );
      }
      return newProgress;
    }
  }

  export function maybeApplySuperset(
    progress: IHistoryRecord,
    entryIndex: number,
    mode: "workout" | "warmup"
  ): IHistoryRecord {
    if (!Progress.isCurrent(progress)) {
      return progress;
    }
    const entry = progress.entries[entryIndex];
    const nextEntryIndex = getNextEntryIndex(progress, entry, mode);
    if (nextEntryIndex != null) {
      return { ...progress, ui: { ...progress.ui, currentEntryIndex: nextEntryIndex } };
    }
    return progress;
  }

  export function stopTimer(progress: IHistoryRecord): IHistoryRecord {
    SendMessage.toIos({ type: "stopTimer" });
    SendMessage.toAndroid({ type: "stopTimer" });
    return stopTimerPure(progress);
  }

  export function stopTimerPure(progress: IHistoryRecord): IHistoryRecord {
    return {
      ...progress,
      timerSince: undefined,
      timerMode: undefined,
      timer: undefined,
      timerSetIndex: undefined,
      timerEntryIndex: undefined,
    };
  }

  export function setTimerValue(progress: IHistoryRecord, newTimer: number): IHistoryRecord {
    if (progress.timerSince == null) {
      return progress;
    }
    return {
      ...progress,
      timer: Math.max(0, newTimer),
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

  export function isFullyEmptyOrFinishedSet(progress: IHistoryRecord): boolean {
    return progress.entries.every((entry) => isEmptyOrFinishedSet(entry));
  }

  export function isEmptyOrFinishedSet(entry: IHistoryEntry): boolean {
    return Reps.isEmptyOrFinished(entry.sets);
  }

  export function hasLastUnfinishedSet(entry: IHistoryEntry): boolean {
    return entry.sets.filter((s) => !s.isCompleted).length === 1;
  }

  export function isChanged(aProgress?: IHistoryRecord, bProgress?: IHistoryRecord): boolean {
    if (aProgress != null && bProgress == null) {
      return true;
    } else if (aProgress == null && bProgress != null) {
      return true;
    } else if (aProgress == null && bProgress == null) {
      return false;
    } else {
      const changed = !ObjectUtils.isEqual(aProgress!, bProgress!);
      return changed;
    }
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

  export function getColorToSupersetGroup(progress: IHistoryRecord): Partial<Record<string, IHistoryEntry[]>> {
    const groups = getSupersetGroups(progress.entries);
    const colors = ["red", "blue", "green", "purple"];
    let index = 0;
    return ObjectUtils.entriesNonnull(groups).reduce<Partial<Record<string, IHistoryEntry[]>>>((memo, [, group]) => {
      const color = colors[index % colors.length];
      memo[color] = group;
      index += 1;
      return memo;
    }, {});
  }

  export function getSupersetGroups(entries: IHistoryEntry[]): Partial<Record<string, IHistoryEntry[]>> {
    const groups: Partial<Record<string, IHistoryEntry[]>> = {};
    for (const entry of entries) {
      if (entry.superset != null) {
        if (!groups[entry.superset]) {
          groups[entry.superset] = [];
        }
        groups[entry.superset]!.push(entry);
      }
    }
    return groups;
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

  export function changeDate(progress: IHistoryRecord, dateStr?: string, time?: number): IHistoryRecord {
    let startTime = progress.startTime;
    const startTimeDate = new Date(startTime);
    const date = dateStr != null ? DateUtils.fromYYYYMMDD(dateStr) : undefined;
    if (date != null) {
      startTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        startTimeDate.getHours(),
        startTimeDate.getMinutes(),
        startTimeDate.getSeconds()
      ).getTime();
    }
    const endTime = time != null ? startTime + time : startTime + History.workoutTime(progress);
    return {
      ...progress,
      ...(dateStr != null ? { date: DateUtils.fromYYYYMMDDStr(dateStr) } : {}),
      startTime,
      intervals: [[startTime, endTime]],
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

  export function lbProgress(progressId?: number): LensBuilder<IState, IHistoryRecord, {}> {
    if (progressId == null || progressId === 0) {
      return lb<IState>().p("storage").pi("progress").i(0);
    } else {
      return lb<IState>().pi("progress").pi(progressId);
    }
  }

  export function getCurrentProgress(state: Pick<IState, "screenStack" | "storage">): IHistoryRecord | undefined {
    const progressId = getProgressId(state.screenStack);
    if (progressId === 0) {
      return state.storage.progress?.[0];
    }
    return undefined;
  }

  export function getProgress(state: Pick<IState, "screenStack" | "storage">): IHistoryRecord | undefined {
    const progressId = getProgressId(state.screenStack);
    if (progressId === 0) {
      return state.storage.progress?.[0];
    } else {
      return (state as IState).progress[progressId];
    }
  }

  export function setProgress(state: IState, progress: IHistoryRecord): IState {
    if (progress.id === 0) {
      return lf(state).p("storage").p("progress").set([progress]);
    } else {
      return lf(state).pi("progress").p(progress.id).set(progress);
    }
  }

  export function runUpdateScriptForEntry(
    entry: IHistoryEntry,
    dayData: IDayData,
    programExercise: IPlannerProgramExercise,
    otherStates: IByTag<IProgramState>,
    setIndex: number,
    settings: ISettings,
    stats: IStats
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
      Stats.getCurrentMovingAverageBodyweight(stats, settings),
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
      const newEntry = Progress.applyBindings(entry, bindings, settings);
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
    settings: ISettings,
    stats: IStats
  ): IHistoryRecord {
    const programDay = Program.getProgramDay(program, day);
    if (!programDay) {
      return aProgress;
    }
    const dayExercises = Program.getProgramDayUsedExercises(programDay);
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
          settings,
          stats
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
    settings: ISettings,
    stats: IStats
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
      settings,
      stats
    );
    const progress = lf(aProgress).p("entries").i(entryIndex).set(newEntry);
    return progress;
  }

  export function applyBindings(
    oldEntry: IHistoryEntry,
    bindings: IScriptBindings,
    settings: ISettings
  ): IHistoryEntry {
    const keys = [
      "RPE",
      "minReps",
      "reps",
      "weights",
      "amraps",
      "logrpes",
      "timers",
      "originalWeights",
      "askweights",
    ] as const;
    const entry = ObjectUtils.clone(oldEntry);
    const lastCompletedIndex = CollectionUtils.findIndexReverse(bindings.completedReps, (r) => r != null) + 1;
    entry.sets = entry.sets.slice(0, Math.max(lastCompletedIndex, bindings.numberOfSets, 0));
    for (const key of keys) {
      for (let i = 0; i < bindings[key].length; i += 1) {
        if (entry.sets[i] == null) {
          entry.sets[i] = {
            vtype: "set",
            id: UidFactory.generateUid(6),
            index: i,
            isUnilateral: Exercise.getIsUnilateral(entry.exercise, settings),
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
          } else if (key === "askweights") {
            const value = bindings.askweights[i];
            entry.sets[i].askWeight = !!value;
          } else if (key === "timers") {
            const value = bindings.timers[i];
            entry.sets[i].timer = value !== 0 ? value : undefined;
          }
        }
      }
    }
    return entry;
  }

  export function completeAmrapSet(
    progress: IHistoryRecord,
    entryIndex: number,
    setIndex: number,
    settings: ISettings
  ): IHistoryRecord {
    const entry = progress.entries[entryIndex];
    const isUnilateral = Exercise.getIsUnilateral(entry.exercise, settings);
    return lf(progress)
      .p("entries")
      .i(entryIndex)
      .p("sets")
      .i(setIndex)
      .modify((progressSet) => {
        return {
          ...progressSet,
          timestamp: !progressSet.isCompleted ? Date.now() : progressSet.timestamp,
          completedRepsLeft: isUnilateral ? (progressSet.completedRepsLeft ?? progressSet.reps) : undefined,
          completedReps: progressSet.completedReps ?? progressSet.reps,
          completedWeight: progressSet.completedWeight ?? progressSet.weight,
          isCompleted: !progressSet.isCompleted,
        };
      });
  }

  export function shouldShowAmrapModal(
    entry: IHistoryEntry,
    setIndex: number,
    mode: IProgressMode,
    hasUserPromptedVars: boolean,
    settings: ISettings
  ): boolean {
    const set = mode === "warmup" ? entry.warmupSets[setIndex] : entry.sets[setIndex];
    const shouldLogRpe = !!set?.logRpe;
    const shouldPromptUserVars = hasUserPromptedVars && Progress.hasLastUnfinishedSet(entry);
    const isUnilateral = Exercise.getIsUnilateral(entry.exercise, settings);
    const isAmrap =
      (set?.completedReps == null || (isUnilateral && set?.completedRepsLeft == null)) &&
      (!!set?.isAmrap || set.reps == null);
    const shouldAskWeight = set?.completedWeight == null && (!!set?.askWeight || set.weight == null);
    return !set.isCompleted && (shouldLogRpe || shouldPromptUserVars || isAmrap || shouldAskWeight);
  }

  export function completeSet(
    progress: IHistoryRecord,
    entryIndex: number,
    setIndex: number,
    mode: IProgressMode,
    hasUserPromptedVars: boolean,
    settings: ISettings
  ): IHistoryRecord {
    const entry = progress.entries[entryIndex];
    const set = mode === "warmup" ? entry.warmupSets[setIndex] : entry.sets[setIndex];
    const shouldLogRpe = !!set?.logRpe;
    const shouldPromptUserVars = hasUserPromptedVars && Progress.hasLastUnfinishedSet(entry);
    const isUnilateral = Exercise.getIsUnilateral(entry.exercise, settings);
    const isAmrap =
      (set?.completedReps == null || (isUnilateral && set?.completedRepsLeft == null)) &&
      (!!set?.isAmrap || set.reps == null);
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
            completedRepsLeft: isUnilateral ? (progressSet.completedRepsLeft ?? progressSet.reps) : undefined,
            completedReps: progressSet.completedReps ?? progressSet.reps,
            completedWeight: progressSet.completedWeight ?? progressSet.weight,
            isCompleted: !progressSet.isCompleted,
          };
        });
    } else if (Progress.shouldShowAmrapModal(entry, setIndex, mode, hasUserPromptedVars, settings)) {
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
      return completeAmrapSet(progress, entryIndex, setIndex, settings);
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

  export function updateAmrapRepsLeftInExercise(progress: IHistoryRecord, value?: number): IHistoryRecord {
    if (progress.ui?.amrapModal != null) {
      const { entryIndex, setIndex } = progress.ui.amrapModal;
      return lf(progress).p("entries").i(entryIndex).p("sets").i(setIndex).p("completedRepsLeft").set(value);
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

  export function addExercise(dispatch: IDispatch, exerciseType: IExerciseType, numberOfEntries: number): void {
    updateProgress(
      dispatch,
      [
        lb<IHistoryRecord>()
          .p("entries")
          .recordModify((entries) => {
            return [...entries, History.createCustomEntry(exerciseType, numberOfEntries)];
          }),
      ],
      "add-exercise"
    );
  }

  export function isEligibleForInferredWeight(set: ISet): boolean {
    return set.originalWeight == null && set.reps != null && set.rpe != null;
  }

  export function updateSetWeights(
    entry: IHistoryEntry,
    exerciseType: IExerciseType,
    settings: ISettings
  ): IHistoryEntry {
    const newSets = entry.sets.map((set) => {
      if ((Progress.isEligibleForInferredWeight(set) || Weight.isPct(set.originalWeight)) && !set.isCompleted) {
        const originalWeight = set.originalWeight ?? Weight.rpePct(set.reps ?? 1, set.rpe ?? 10);
        const evaluatedWeight = Weight.evaluateWeight(originalWeight, exerciseType, settings);
        const unit = Equipment.getUnitForExerciseType(settings, exerciseType) ?? settings.units;
        const weight = Weight.roundConvertTo(evaluatedWeight, settings, unit, exerciseType);
        return { ...set, weight };
      }
      return set;
    });
    return { ...entry, sets: newSets };
  }

  export function doesUse1RM(entry: IHistoryEntry): boolean {
    return entry.sets.some((set) => (set.originalWeight == null ? set.rpe != null : Weight.isPct(set.originalWeight)));
  }

  export function changeExercise(
    dispatch: IDispatch,
    settings: ISettings,
    progressId: number,
    exerciseType: IExerciseType,
    entryIndex: number,
    shouldKeepProgramExerciseId: boolean
  ): void {
    updateState(
      dispatch,
      [
        Progress.lbProgress(progressId)
          .p("entries")
          .i(entryIndex)
          .recordModify((entry) => {
            entry = Progress.updateSetWeights(entry, exerciseType, settings);
            return {
              ...entry,
              exercise: exerciseType,
              ...(shouldKeepProgramExerciseId ? {} : { programExerciseId: undefined }),
              changed: true,
            };
          }),
      ],
      "Change exercise"
    );
  }

  export function changeEquipment(
    dispatch: IDispatch,
    progressId: number,
    entryIndex: number,
    equipment: IEquipment
  ): void {
    updateState(
      dispatch,
      [Progress.lbProgress(progressId).p("entries").i(entryIndex).p("exercise").p("equipment").record(equipment)],
      "Change equipment"
    );
  }

  export function editNotes(dispatch: IDispatch, progressId: number, notes: string): void {
    updateState(dispatch, [Progress.lbProgress(progressId).p("notes").record(notes)], "Edit workout notes");
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
    index: number,
    programExercise: IPlannerProgramExerciseWithType,
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
          const originalWeight = programSet.weight;
          const weight = ProgramSet.getEvaluatedWeight(programSet, programExercise.exerciseType, settings);
          newSets.push({
            ...progressSet,
            vtype: "set",
            index: newSets.length,
            reps: programSet.maxrep,
            minReps: programSet.minrep,
            rpe: programSet.rpe,
            isUnilateral: Exercise.getIsUnilateral(programExercise.exerciseType, settings),
            originalWeight,
            weight,
            isAmrap: programSet.isAmrap,
            logRpe: programSet.logRpe,
            label: programSet.label,
          });
        }
      }
      let newWarmupSets = progressEntry.warmupSets;
      if (progressEntry.warmupSets.every((w) => !w.isCompleted)) {
        const firstWeight = newSets[0]?.weight;
        forceWarmupSets = forceWarmupSets || Reps.isEmpty(newSets);
        newWarmupSets = forceWarmupSets
          ? firstWeight != null
            ? Exercise.getWarmupSets(programExercise.exerciseType, firstWeight, settings, programExerciseWarmupSets)
            : []
          : progressEntry.warmupSets;
      }

      return {
        ...progressEntry,
        exercise: progressEntry.changed ? progressEntry.exercise : programExercise.exerciseType,
        warmupSets: newWarmupSets,
        sets: newSets,
      };
    } else {
      const newSets = sets.map((set, i) => {
        const weight = ProgramSet.getEvaluatedWeight(set, programExercise.exerciseType, settings);
        return {
          vtype: "set" as const,
          index: i,
          reps: set.maxrep,
          minReps: set.minrep,
          originalWeight: set.weight,
          isUnilateral: Exercise.getIsUnilateral(programExercise.exerciseType, settings),
          weight,
          rpe: set.rpe,
          logRpe: set.logRpe,
          isAmrap: set.isAmrap,
          label: set.label,
        };
      });
      const firstWeight = newSets[0]?.weight;

      return {
        vtype: "history_entry",
        index,
        id: Progress.getEntryId(programExercise.exerciseType, programExercise.label),
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

  export function getEntryId(exerciseType: IExerciseType, label?: string): string {
    return CollectionUtils.compact([label, Exercise.toKey(exerciseType)]).join("_");
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
    const newEntries = progress.entries.map((entry, index) => {
      if (entry.programExerciseId == null) {
        return entry;
      }
      if (programExerciseIds != null && !programExerciseIds.includes(entry.programExerciseId)) {
        return entry;
      }
      const programExercise = Program.getProgramExerciseForKeyAndDay(program, day, entry.programExerciseId);
      if (!programExercise) {
        return entry;
      }
      return applyProgramExercise(entry, index, programExercise, settings, false);
    });

    return { ...progress, entries: newEntries };
  }

  export function changeAmrapAction(
    settings: ISettings,
    stats: IStats,
    progress: IHistoryRecord,
    action: IChangeAMRAPAction,
    subscription: ISubscription | undefined
  ): IHistoryRecord {
    let newProgress = { ...progress };
    if (
      action.amrapValue == null &&
      action.amrapLeftValue == null &&
      action.rpeValue == null &&
      action.weightValue == null &&
      ObjectUtils.keys(action.userVars || {}).length === 0
    ) {
      return { ...newProgress, ui: { ...newProgress.ui, amrapModal: undefined } };
    }
    if (action.amrapValue != null) {
      newProgress = Progress.updateAmrapRepsInExercise(newProgress, action.amrapValue);
    }
    if (action.amrapLeftValue != null) {
      newProgress = Progress.updateAmrapRepsLeftInExercise(newProgress, action.amrapLeftValue);
    }
    if (action.logRpe) {
      newProgress = Progress.updateRpeInExercise(newProgress, action.rpeValue);
    }
    if (action.weightValue != null) {
      newProgress = Progress.updateWeightInExercise(newProgress, action.weightValue);
    }
    const programExerciseId = action.programExercise?.key;
    if (ObjectUtils.keys(action.userVars || {}).length > 0 && programExerciseId != null) {
      newProgress = Progress.updateUserPromptedStateVars(newProgress, programExerciseId, action.userVars || {});
    }
    newProgress = Progress.completeAmrapSet(newProgress, action.entryIndex, action.setIndex, settings);
    if (action.programExercise) {
      newProgress = Progress.runUpdateScript(
        newProgress,
        action.programExercise,
        action.otherStates || {},
        action.entryIndex,
        action.setIndex,
        "workout",
        settings,
        stats
      );
    }
    if (Progress.isFullyFinishedSet(newProgress)) {
      newProgress = Progress.stopTimer(newProgress);
    }
    newProgress = Progress.maybeApplySuperset(newProgress, action.entryIndex, "workout");
    newProgress = Progress.startTimer(
      newProgress,
      new Date().getTime(),
      "workout",
      action.entryIndex,
      action.setIndex,
      settings,
      subscription
    );
    newProgress.intervals = History.resumeWorkout(newProgress, action.isPlayground, settings.timers.reminder);
    LiveActivityManager.updateLiveActivityForNextEntry(
      newProgress,
      action.entryIndex,
      "workout",
      action.programExercise,
      settings,
      subscription
    );
    return { ...newProgress, ui: { ...newProgress.ui, amrapModal: undefined } };
  }

  export function completeSetAction(
    settings: ISettings,
    stats: IStats,
    progress: IHistoryRecord,
    action: ICompleteSetAction,
    subscription: ISubscription | undefined
  ): IHistoryRecord {
    const hasUserPromptedVars = action.programExercise && ProgramExercise.hasUserPromptedVars(action.programExercise);
    let newProgress = Progress.completeSet(
      progress,
      action.entryIndex,
      action.setIndex,
      action.mode,
      !!hasUserPromptedVars,
      settings
    );
    const oldSet =
      progress.entries[action.entryIndex][action.mode === "warmup" ? "warmupSets" : "sets"][action.setIndex];
    const newSet =
      newProgress.entries[action.entryIndex][action.mode === "warmup" ? "warmupSets" : "sets"][action.setIndex];
    const didFinish = !oldSet.isCompleted && newSet.isCompleted;
    if (action.programExercise && !newProgress.ui?.amrapModal) {
      newProgress = Progress.runUpdateScript(
        newProgress,
        action.programExercise,
        action.otherStates || {},
        action.entryIndex,
        action.setIndex,
        action.mode,
        settings,
        stats
      );
    }

    if (Progress.isFullyFinishedSet(newProgress)) {
      newProgress = Progress.stopTimer(newProgress);
    }
    if (didFinish) {
      newProgress = Progress.maybeApplySuperset(newProgress, action.entryIndex, action.mode);
    }
    if (!action.isPlayground) {
      newProgress = Progress.startTimer(
        newProgress,
        new Date().getTime(),
        action.mode,
        action.entryIndex,
        action.setIndex,
        settings,
        subscription
      );
    }
    newProgress.intervals = History.resumeWorkout(newProgress, action.isPlayground, settings.timers.reminder);
    LiveActivityManager.updateLiveActivityForNextEntry(
      newProgress,
      action.entryIndex,
      action.mode,
      action.programExercise,
      settings,
      subscription
    );
    if (action.forceUpdateEntryIndex) {
      newProgress = {
        ...newProgress,
        ui: { ...newProgress.ui, forceUpdateEntryIndex: !newProgress.ui?.forceUpdateEntryIndex },
      };
    }
    if (action.isExternal) {
      newProgress = {
        ...newProgress,
        ui: { ...newProgress.ui, isExternal: true },
      };
    }
    return newProgress;
  }

  export function forceUpdateEntryIndex(dispatch: IDispatch): void {
    updateProgress(
      dispatch,
      [
        lb<IHistoryRecord>()
          .pi("ui")
          .p("forceUpdateEntryIndex")
          .recordModify((v) => !v),
      ],
      "Force update entry index"
    );
  }
}
