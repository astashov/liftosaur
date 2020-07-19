import { IExcerciseType, Excercise, TExcerciseType } from "./excercise";
import { Reps } from "./set";
import { IWeight, Weight } from "./weight";
import { IHistoryRecord, IHistoryEntry } from "./history";
import { DateUtils } from "../utils/date";
import { lf } from "../utils/lens";
import { IState } from "../ducks/reducer";
import { ObjectUtils } from "../utils/object";
import * as t from "io-ts";
import { ISettings } from "./settings";

export const TProgressUi = t.partial(
  {
    amrapModal: t.type({
      excercise: TExcerciseType,
      setIndex: t.number,
      weight: t.number,
    }),
    weightModal: t.type({
      excercise: TExcerciseType,
      weight: t.number,
    }),
    dateModal: t.type({
      date: t.string,
    }),
  },
  "TProgressUi"
);

export type IProgressUi = t.TypeOf<typeof TProgressUi>;

export const TProgressMode = t.keyof(
  {
    warmup: null,
    workout: null,
  },
  "TProgressMode"
);

export type IProgressMode = t.TypeOf<typeof TProgressMode>;

export interface IScriptBindings {
  day: number;
  weights: number[][];
  reps: number[][];
  completedReps: number[][];
  w: number[][];
  r: number[][];
  cr: number[][];
}

export interface IScriptFunctions {
  roundWeight: (num: number) => number;
  calculateTrainingMax: (weight: number, reps: number) => number;
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
    };
  }

  export function createScriptBindings(progress: IHistoryRecord): IScriptBindings {
    const bindings = createEmptyScriptBindings(progress.day);
    for (const entry of progress.entries) {
      bindings.weights.push([]);
      bindings.reps.push([]);
      bindings.completedReps.push([]);
      for (const set of entry.sets) {
        bindings.weights[bindings.weights.length - 1].push(set.weight);
        bindings.reps[bindings.reps.length - 1].push(set.reps);
        bindings.completedReps[bindings.completedReps.length - 1].push(set.completedReps || 0);
      }
    }
    bindings.w = bindings.weights;
    bindings.r = bindings.reps;
    bindings.cr = bindings.completedReps;
    return bindings;
  }

  export function createScriptFunctions(settings: ISettings): IScriptFunctions {
    return {
      roundWeight: (num) => Weight.round(num || 0, settings),
      calculateTrainingMax: (weight, reps) => Weight.getTrainingMax(weight, reps || 0),
    };
  }

  export function isCurrent(progress: IHistoryRecord): boolean {
    return progress.id === 0;
  }

  export function startTimer(progress: IHistoryRecord, timestamp: number, mode: IProgressMode): IHistoryRecord {
    return {
      ...progress,
      timerSince: timestamp,
      timerMode: mode,
    };
  }

  export function stopTimer(progress: IHistoryRecord): IHistoryRecord {
    return {
      ...progress,
      timerSince: undefined,
      timerMode: undefined,
    };
  }

  export function findEntryByExcercise(
    progress: IHistoryRecord,
    excerciseType: IExcerciseType
  ): IHistoryEntry | undefined {
    return progress.entries.find((entry) => entry.excercise === excerciseType);
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
    excercise: IExcerciseType,
    weight: IWeight
  ): IHistoryRecord {
    return {
      ...progress,
      ui: {
        ...progress.ui,
        weightModal: {
          excercise,
          weight,
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

  export function updateRepsInExcercise(
    progress: IHistoryRecord,
    excercise: IExcerciseType,
    weight: IWeight,
    setIndex: number,
    mode: IProgressMode
  ): IHistoryRecord {
    if (mode === "warmup") {
      const firstWeight = progress.entries.find((e) => e.excercise === excercise)?.sets[0]?.weight;
      if (firstWeight != null) {
        return {
          ...progress,
          entries: progress.entries.map((progressEntry) => {
            if (progressEntry.excercise === excercise) {
              const progressSets = progressEntry.warmupSets;
              const progressSet = progressSets[setIndex];
              if (progressSet?.completedReps == null) {
                progressSets[setIndex] = { ...progressSet, completedReps: progressSet.reps as number, weight };
              } else if (progressSet.completedReps > 0) {
                progressSets[setIndex] = {
                  ...progressSet,
                  completedReps: progressSet.completedReps - 1,
                  weight,
                };
              } else {
                progressSets[setIndex] = { ...progressSet, completedReps: undefined, weight };
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
      const entry = progress.entries.find((e) => e.excercise === excercise)!;
      if (entry.sets[setIndex].isAmrap) {
        const amrapUi: IProgressUi = { amrapModal: { excercise, setIndex, weight } };
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
          entries: progress.entries.map((progressEntry) => {
            if (progressEntry.excercise === excercise) {
              const sets = [...progressEntry.sets];
              const set = sets[setIndex];
              if (set.completedReps == null) {
                sets[setIndex] = {
                  ...set,
                  completedReps: set.reps as number,
                  weight,
                  timestamp: set.timestamp ?? Date.now(),
                };
              } else if (set.completedReps > 0) {
                sets[setIndex] = {
                  ...set,
                  completedReps: set.completedReps - 1,
                  weight,
                  timestamp: set.timestamp ?? Date.now(),
                };
              } else {
                sets[setIndex] = { ...set, completedReps: undefined, weight, timestamp: set.timestamp ?? Date.now() };
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

  export function updateAmrapRepsInExcercise(progress: IHistoryRecord, value?: number): IHistoryRecord {
    if (progress.ui?.amrapModal != null) {
      const { excercise, setIndex, weight } = progress.ui.amrapModal;
      return {
        ...progress,
        ui: { ...progress.ui, amrapModal: undefined },
        entries: progress.entries.map((progressEntry) => {
          if (progressEntry.excercise === excercise) {
            const sets = [...progressEntry.sets];
            const set = sets[setIndex];
            if (value == null) {
              sets[setIndex] = { ...set, completedReps: undefined, weight };
            } else {
              sets[setIndex] = { ...set, completedReps: value, weight };
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

  export function updateWeight(progress: IHistoryRecord, weight?: IWeight): IHistoryRecord {
    if (progress.ui?.weightModal != null) {
      const { excercise, weight: previousWeight } = progress.ui.weightModal;
      return {
        ...progress,
        ui: { ...progress.ui, weightModal: undefined },
        entries: progress.entries.map((progressEntry) => {
          if (progressEntry.excercise === excercise) {
            const firstWeight = progressEntry.sets[0]?.weight;
            return {
              ...progressEntry,
              sets: progressEntry.sets.map((set) => {
                if (set.weight === previousWeight && weight != null) {
                  return { ...set, weight: Weight.round(weight) };
                } else {
                  return set;
                }
              }),
              warmupSets:
                firstWeight === previousWeight && weight != null
                  ? Excercise.getWarmupSets(excercise, weight)
                  : progressEntry.warmupSets,
            };
          } else {
            return progressEntry;
          }
        }),
      };
    } else {
      return progress;
    }
  }
}
