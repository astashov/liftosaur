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

import { Program } from "./program";
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
  IProgramDay,
  IDayData,
} from "../types";
import { SendMessage } from "../utils/sendMessage";
import { ProgramExercise } from "./programExercise";
import { Subscriptions } from "../utils/subscriptions";
import { IExerciseId, IPercentage } from "../types";
import { History } from "./history";
import { CollectionUtils } from "../utils/collection";
import { MathUtils } from "../utils/math";

export interface IScriptBindings {
  day: number;
  week: number;
  dayInWeek: number;
  weights: IWeight[];
  rm1: IWeight;
  reps: number[];
  minReps: number[];
  RPE: number[];
  completedRPE: number[];
  completedReps: number[];
  w: IWeight[];
  r: number[];
  mr: number[];
  cr: number[];
  ns: number;
  numberOfSets: number;
  setVariationIndex: number;
  setIndex: number;
}

export interface IScriptContext {
  equipment?: IEquipment;
}

export interface IScriptFunctions {
  roundWeight: (num: IWeight, context: IScriptContext) => IWeight;
  calculateTrainingMax: (weight: IWeight, reps: number, context: IScriptContext) => IWeight;
  calculate1RM: (weight: IWeight, reps: number, context: IScriptContext) => IWeight;
  rpeMultiplier: (reps: number, rpe: number, context: IScriptContext) => number;
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
}

function floor(num: number): number;
function floor(num: IWeight): IWeight;
function floor(num: IWeight | number): IWeight | number {
  return typeof num === "number" ? Math.floor(num) : Weight.build(Math.floor(num.value), num.unit);
}

function ceil(num: number): number;
function ceil(num: IWeight): IWeight;
function ceil(num: IWeight | number): IWeight | number {
  return typeof num === "number" ? Math.ceil(num) : Weight.build(Math.ceil(num.value), num.unit);
}

function round(num: number): number;
function round(num: IWeight): IWeight;
function round(num: IWeight | number): IWeight | number {
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
    return (vals as number[]).reduce((acc, a) => acc + a, 0);
  } else {
    return (vals as IWeight[]).reduce((acc, a) => Weight.add(acc, a), Weight.build(0, firstElement.unit));
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
    return Math.min(...(vals as number[]));
  } else {
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
    return Math.max(...(vals as number[]));
  } else {
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
    const rm1 = exercise ? Exercise.rm1(exercise, settings.exerciseData, settings.units) : Weight.build(0, "lb");
    return {
      day: dayData.day,
      week: dayData.week ?? 1,
      dayInWeek: dayData.dayInWeek ?? dayData.day,
      weights: [],
      reps: [],
      minReps: [],
      RPE: [],
      completedReps: [],
      completedRPE: [],
      w: [],
      r: [],
      cr: [],
      mr: [],
      numberOfSets: 0,
      ns: 0,
      setVariationIndex: 1,
      setIndex: 1,
      rm1,
    };
  }

  export function createScriptBindings(
    dayData: IDayData,
    entry: IHistoryEntry,
    settings: ISettings,
    setIndex?: number,
    setVariationIndex?: number
  ): IScriptBindings {
    const bindings = createEmptyScriptBindings(dayData, settings, entry.exercise);
    for (const set of entry.sets) {
      bindings.weights.push(Weight.roundConvertTo(set.weight, settings, entry.exercise.equipment));
      bindings.reps.push(set.reps);
      bindings.minReps.push(set.minReps != null ? set.minReps : set.reps);
      bindings.completedReps.push(set.completedReps || 0);
      bindings.completedRPE.push(set.completedRpe || 0);
      bindings.RPE.push(set.rpe || 0);
    }
    bindings.w = bindings.weights;
    bindings.r = bindings.reps;
    bindings.cr = bindings.completedReps;
    bindings.mr = bindings.minReps;
    bindings.ns = entry.sets.length;
    bindings.numberOfSets = entry.sets.length;
    bindings.setIndex = setIndex ?? 1;
    bindings.setVariationIndex = setVariationIndex ?? 1;
    return bindings;
  }

  export function createScriptFunctions(settings: ISettings): IScriptFunctions {
    return {
      roundWeight: (num, context) => {
        if (!Weight.is(num)) {
          num = Weight.build(num, settings.units);
        }
        return Weight.round(num, settings, context?.equipment || "barbell");
      },
      calculateTrainingMax: (weight, reps, context) => {
        if (!Weight.is(weight)) {
          weight = Weight.build(weight, settings.units);
        }
        return Weight.getTrainingMax(weight, reps || 0, settings, "barbell");
      },
      calculate1RM: (weight, reps, context) => {
        if (!Weight.is(weight)) {
          weight = Weight.build(weight, settings.units);
        }
        return Weight.getOneRepMax(weight, reps, settings, undefined);
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
      const timerExpr = setTimerExpr || ProgramExercise.getTimerExpr(programExercise, program.exercises);
      const bindings = Progress.createScriptBindings(
        Progress.getDayData(progress),
        entry,
        settings,
        setIndex + 1,
        setVariationIndex
      );
      if (timerExpr?.trim() && state) {
        timer = ScriptRunner.safe(
          () =>
            new ScriptRunner(
              timerExpr,
              state,
              bindings,
              Progress.createScriptFunctions(settings),
              settings.units,
              {
                equipment: exercise.equipment,
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
    if (timer != null && Subscriptions.hasSubscription(subscription)) {
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
          const { plates } = Weight.calculatePlates(set.weight, settings, entry.exercise.equipment);
          subtitleHeader = "Next Set";
          subtitle = `${exercise.name}, ${set.reps}${set.isAmrap ? "+" : ""} reps, ${Weight.display(set.weight)}`;
          const formattedPlates =
            plates.length > 0 ? Weight.formatOneSide(settings, plates, exercise.equipment) : "None";
          bodyHeader = "Plates per side";
          body = formattedPlates;
        }
      }
      SendMessage.toIos({
        type: "startTimer",
        duration: timerForPush.toString(),
        mode,
        title,
        subtitleHeader,
        subtitle,
        bodyHeader,
        body,
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
    programExercise?: IProgramExercise
  ): IHistoryRecord {
    return {
      ...progress,
      ui: {
        ...progress.ui,
        weightModal: {
          exercise,
          weight: weight,
          programExercise,
        },
      },
    };
  }

  export function showUpdateDate(progress: IHistoryRecord, date: string): IHistoryRecord {
    return {
      ...progress,
      ui: {
        ...progress.ui,
        dateModal: { date },
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

  export function changeDate(progress: IHistoryRecord, date?: string): IHistoryRecord {
    return {
      ...progress,
      ...(date != null ? { date: DateUtils.fromYYYYMMDD(date) } : {}),
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
      const shouldPromptUserVars =
        hasUserPromptedVars &&
        ((Progress.hasLastUnfinishedSet(entry) && !Reps.isFinishedSet(entry.sets[setIndex])) ||
          (isAmrap && Progress.isFinishedSet(entry)));

      if (isAmrap || shouldLogRpe || shouldPromptUserVars) {
        const amrapUi: IProgressUi = {
          amrapModal: {
            entryIndex,
            setIndex,
            isAmrap: isAmrap,
            logRpe: shouldLogRpe,
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

  export function updateWeight(
    progress: IHistoryRecord,
    settings: ISettings,
    weight?: IWeight,
    programExercise?: IProgramExercise
  ): IHistoryRecord {
    if (weight != null && progress.ui?.weightModal != null) {
      const { exercise, weight: previousWeight } = progress.ui.weightModal;

      return {
        ...progress,
        ui: { ...progress.ui, weightModal: undefined },
        entries: progress.entries.map((progressEntry) => {
          const eq = (a: IWeight, b: IWeight): boolean => {
            const bar = progressEntry.exercise.equipment;
            return Weight.eq(Weight.roundConvertTo(a, settings, bar), Weight.roundConvertTo(b, settings, bar));
          };
          if (Exercise.eq(progressEntry.exercise, exercise)) {
            const firstWeight = progressEntry.sets[0]?.weight;
            return {
              ...progressEntry,
              sets: progressEntry.sets.map((set) => {
                if (eq(set.weight, previousWeight) && weight != null) {
                  return { ...set, weight: Weight.round(weight, settings, progressEntry.exercise.equipment) };
                } else {
                  return set;
                }
              }),
              warmupSets:
                eq(firstWeight, previousWeight) && weight != null
                  ? Exercise.getWarmupSets(exercise, weight, settings, programExercise?.warmupSets)
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
    updateState(dispatch, [
      lb<IState>().p("progress").pi(progressId).pi("ui").p("addExerciseModal").record({ isShown: true }),
    ]);
  }

  export function addExercise(
    dispatch: IDispatch,
    progressId: number,
    exerciseId: IExerciseId,
    settings: ISettings
  ): void {
    updateState(dispatch, [
      lb<IState>()
        .p("progress")
        .pi(progressId)
        .p("entries")
        .recordModify((entries) => {
          return [...entries, History.createCustomEntry(exerciseId, settings)];
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
            { equipment: programExercise.exerciseType.equipment },
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
            { equipment: programExercise.exerciseType.equipment },
            settings,
            "weight"
          );
          newSets.push({
            ...progressSet,
            reps: executeEntryScript(
              programSet.repsExpr,
              programExercise.exerciseType,
              dayData,
              state,
              { equipment: programExercise.exerciseType.equipment },
              settings,
              "reps"
            ),
            weight,
            isAmrap: programSet.isAmrap,
            label: programSet.label,
          });
        }
      }
      forceWarmupSets = forceWarmupSets || Reps.isEmpty(newSets);

      return {
        ...progressEntry,
        exercise: programExercise.exerciseType,
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
            { equipment: programExercise.exerciseType.equipment },
            settings,
            "weight"
          );
          return {
            reps: executeEntryScript(
              set.repsExpr,
              programExercise.exerciseType,
              dayData,
              state,
              { equipment: programExercise.exerciseType.equipment },
              settings,
              "reps"
            ),
            weight,
            rpe: set.rpeExpr
              ? executeEntryScript(
                  set.rpeExpr,
                  programExercise.exerciseType,
                  dayData,
                  state,
                  { equipment: programExercise.exerciseType.equipment },
                  settings,
                  "rpe"
                )
              : undefined,
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
    program: IProgram,
    programDay: IProgramDay,
    settings: ISettings,
    staticStates?: Partial<Record<string, IProgramState>>,
    programExerciseIds?: string[],
    checkReused?: boolean
  ): IHistoryRecord {
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
    context: IScriptContext,
    settings: ISettings,
    type: "weight"
  ): IWeight;
  export function executeEntryScript(
    expr: string,
    exerciseType: IExerciseType,
    dayData: IDayData,
    state: IProgramState,
    context: IScriptContext,
    settings: ISettings,
    type: "reps" | "rpe"
  ): number;
  export function executeEntryScript(
    expr: string,
    exerciseType: IExerciseType,
    dayData: IDayData,
    state: IProgramState,
    context: IScriptContext,
    settings: ISettings,
    type: "timer"
  ): number;
  export function executeEntryScript(
    expr: string,
    exerciseType: IExerciseType,
    dayData: IDayData,
    state: IProgramState,
    context: IScriptContext,
    settings: ISettings,
    type: "reps" | "weight" | "timer" | "rpe"
  ): IWeight | IPercentage | number | undefined {
    const runner = new ScriptRunner(
      expr,
      state,
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
