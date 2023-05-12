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
  IProgramDay,
  IProgramState,
  IEquipment,
  IProgramExercise,
  ISubscription,
  ISet,
} from "../types";
import { SendMessage } from "../utils/sendMessage";
import { ProgramExercise } from "./programExercise";
import { Subscriptions } from "../utils/subscriptions";
import { IExerciseId } from "../types";
import { History } from "./history";

export interface IScriptBindings {
  day: number;
  weights: IWeight[];
  reps: number[];
  completedReps: number[];
  w: IWeight[];
  r: number[];
  cr: number[];
  ns: number;
  numberOfSets: number;
  setIndex: number;
}

export interface IScriptContext {
  equipment?: IEquipment;
}

export interface IScriptFunctions {
  roundWeight: (num: IWeight, context: IScriptContext) => IWeight;
  calculateTrainingMax: (weight: IWeight, reps: number, context: IScriptContext) => IWeight;
  floor(num: number): number;
  floor(num: IWeight): IWeight;
  ceil(num: number): number;
  ceil(num: IWeight): IWeight;
  round(num: number): number;
  round(num: IWeight): IWeight;
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

export namespace Progress {
  export function createEmptyScriptBindings(day: number): IScriptBindings {
    return {
      day,
      weights: [],
      reps: [],
      completedReps: [],
      w: [],
      r: [],
      cr: [],
      numberOfSets: 0,
      ns: 0,
      setIndex: 1,
    };
  }

  export function createScriptBindings(day: number, entry: IHistoryEntry, setIndex?: number): IScriptBindings {
    const bindings = createEmptyScriptBindings(day);
    for (const set of entry.sets) {
      bindings.weights.push(set.weight);
      bindings.reps.push(set.reps);
      bindings.completedReps.push(set.completedReps || 0);
    }
    bindings.w = bindings.weights;
    bindings.r = bindings.reps;
    bindings.cr = bindings.completedReps;
    bindings.ns = entry.sets.length;
    bindings.numberOfSets = entry.sets.length;
    bindings.setIndex = setIndex ?? 1;
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
      floor,
      ceil,
      round,
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
      const timerExpr = ProgramExercise.getTimerExpr(programExercise, program.exercises);
      const state = ProgramExercise.getState(programExercise, program.exercises);
      const bindings = Progress.createScriptBindings(progress.day, entry, setIndex + 1);
      if (timerExpr?.trim() && state) {
        timer = ScriptRunner.safe(
          () =>
            new ScriptRunner(timerExpr, state, bindings, Progress.createScriptFunctions(settings), settings.units, {
              equipment: exercise.equipment,
            }).execute("timer"),
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
    settings: ISettings
  ): IHistoryRecord {
    let timer: number | undefined;
    if (Progress.isCurrent(progress) && mode === "workout") {
      timer = getCustomWorkoutTimerValue(progress, program, entryIndex, setIndex, settings);
    }
    if (timer == null) {
      timer = settings.timers[mode] || undefined;
    }
    if (timer != null && Subscriptions.hasSubscription(subscription)) {
      const title = "It's time for the next set!";
      let subtitle = "";
      let body = "";
      let subtitleHeader = "";
      let bodyHeader = "";
      const nextEntryAndSet = Reps.findNextEntryAndSet(progress, entryIndex);
      if (nextEntryAndSet != null) {
        const { entry, set } = nextEntryAndSet;
        const exercise = Exercise.get(entry.exercise, settings.exercises);
        if (exercise) {
          const { plates } = Weight.calculatePlates(set.weight, settings, entry.exercise.equipment);
          subtitleHeader = "Next Set";
          subtitle = `${exercise.name}, ${set.reps}${set.isAmrap ? "+" : ""} reps, ${Weight.display(set.weight)}`;
          const formattedPlates = plates.length > 0 ? Weight.formatOneSide(plates, exercise.equipment) : "None";
          bodyHeader = "Plates per side";
          body = formattedPlates;
        }
      }
      SendMessage.toIos({
        type: "startTimer",
        duration: timer.toString(),
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
    };
  }

  export function stopTimer(progress: IHistoryRecord): IHistoryRecord {
    SendMessage.toIos({ type: "stopTimer" });
    SendMessage.toAndroid({ type: "stopTimer" });
    return {
      ...progress,
      timerSince: undefined,
      timerMode: undefined,
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
    mode: IProgressMode
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
      if (entry.sets[setIndex].isAmrap) {
        const amrapUi: IProgressUi = { amrapModal: { entryIndex, setIndex } };
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

  export function updateAmrapRepsInExercise(progress: IHistoryRecord, value?: number): IHistoryRecord {
    if (progress.ui?.amrapModal != null) {
      const { entryIndex, setIndex } = progress.ui.amrapModal;
      return {
        ...progress,
        ui: { ...progress.ui, amrapModal: undefined },
        entries: progress.entries.map((progressEntry, i) => {
          if (i === entryIndex) {
            const sets = [...progressEntry.sets];
            const set = sets[setIndex];
            if (value == null) {
              sets[setIndex] = { ...set, completedReps: undefined };
            } else {
              sets[setIndex] = { ...set, completedReps: value };
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
      ui: {
        ...(progress.ui || {}),
        stateVarsUserPromptModal: undefined,
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

  export function applyProgramExercise(
    progressEntry: IHistoryEntry | undefined,
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[],
    day: number,
    settings: ISettings,
    forceWarmupSets?: boolean
  ): IHistoryEntry {
    const variationIndex = Program.nextVariationIndex(programExercise, allProgramExercises, day, settings);
    const sets = ProgramExercise.getVariations(programExercise, allProgramExercises)[variationIndex].sets;
    const state = ProgramExercise.getState(programExercise, allProgramExercises);
    const programExerciseWarmupSets = ProgramExercise.getWarmupSets(programExercise, allProgramExercises);

    const firstWeightExpr = sets[0]?.weightExpr;
    const firstWeight =
      firstWeightExpr != null
        ? executeEntryScript(
            firstWeightExpr,
            day,
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
        if (programSet != null) {
          const weight = executeEntryScript(
            programSet.weightExpr,
            day,
            state,
            { equipment: programExercise.exerciseType.equipment },
            settings,
            "weight"
          );
          const roundedWeight = Weight.roundConvertTo(weight, settings, programExercise.exerciseType.equipment);
          newSets.push({
            ...progressSet,
            reps: executeEntryScript(
              programSet.repsExpr,
              day,
              state,
              { equipment: programExercise.exerciseType.equipment },
              settings,
              "reps"
            ),
            weight: roundedWeight,
            isAmrap: programSet.isAmrap,
          });
        } else if (progressSet != null) {
          newSets.push(progressSet);
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
            day,
            state,
            { equipment: programExercise.exerciseType.equipment },
            settings,
            "weight"
          );
          const roundedWeight = Weight.roundConvertTo(weight, settings, programExercise.exerciseType.equipment);
          return {
            reps: executeEntryScript(
              set.repsExpr,
              day,
              state,
              { equipment: programExercise.exerciseType.equipment },
              settings,
              "reps"
            ),
            weight: roundedWeight,
            isAmrap: set.isAmrap,
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
    settings: ISettings
  ): IHistoryRecord {
    const day = progress.day;
    const existingProgramlessEntries = progress.entries.filter((e) => e.programExerciseId == null);
    return {
      ...progress,
      entries: programDay.exercises
        .filter((e) => !(progress.deletedProgramExercises || {})[e.id])
        .map((dayEntry) => {
          const programExercise = program.exercises.find((e) => e.id === dayEntry.id)!;
          const progressEntry = progress.entries.find((e) => programExercise.id === e.programExerciseId);
          return applyProgramExercise(progressEntry, programExercise, program.exercises, day, settings);
        })
        .concat(existingProgramlessEntries),
    };
  }

  export function executeEntryScript(
    expr: string,
    day: number,
    state: IProgramState,
    context: IScriptContext,
    settings: ISettings,
    type: "weight"
  ): IWeight;
  export function executeEntryScript(
    expr: string,
    day: number,
    state: IProgramState,
    context: IScriptContext,
    settings: ISettings,
    type: "reps"
  ): number;
  export function executeEntryScript(
    expr: string,
    day: number,
    state: IProgramState,
    context: IScriptContext,
    settings: ISettings,
    type: "timer"
  ): number;
  export function executeEntryScript(
    expr: string,
    day: number,
    state: IProgramState,
    context: IScriptContext,
    settings: ISettings,
    type: "reps" | "weight" | "timer"
  ): IWeight | number | undefined {
    const runner = new ScriptRunner(
      expr,
      state,
      createEmptyScriptBindings(day),
      createScriptFunctions(settings),
      settings.units,
      context
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
    } else {
      return ScriptRunner.safe(
        () => runner.execute(type),
        (e) =>
          `There's an error while executing script ${expr}:\n\n${e.message}.\n\nWe fallback to 100. Please fix the exercise's script.`,
        Weight.build(100, settings.units)
      );
    }
  }
}
