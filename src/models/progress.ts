import { IProgram } from "./program";
import { IExcerciseType, Excercise } from "./excercise";
import { Reps, ISet } from "./set";
import { IWeight, Weight } from "./weight";
import { IStats } from "./stats";
import { IHistoryRecord } from "./history";
import { DateUtils } from "../utils/date";

export interface IProgress {
  day: number;
  startTime: number;
  ui: IProgressUi;
  entries: IProgressEntry[];
  historyRecord?: IHistoryRecord;
  timerSince?: number;
  timerMode?: IProgressMode;
}

export interface IProgressUi {
  amrapModal?: {
    excercise: IExcerciseType;
    setIndex: number;
    weight: IWeight;
  };
  weightModal?: {
    excercise: IExcerciseType;
    weight: IWeight;
  };
  dateModal?: {
    date: string;
  };
}

export type IProgressMode = "warmup" | "workout";

export interface IProgressEntry {
  excercise: IExcerciseType;
  sets: ISet[];
  warmupSets: ISet[];
}

export namespace Progress {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function create(program: IProgram, day: number, stats: IStats, state?: any): IProgress {
    const programDay = program.days[day];
    return {
      day,
      ui: {},
      startTime: Date.now(),
      entries: programDay(state).excercises.map(excercise => {
        const firstWeight = excercise.sets[0].weight;
        return {
          excercise: excercise.excercise,
          sets: excercise.sets,
          warmupSets: Excercise.getWarmupSets(excercise.excercise, firstWeight)
        };
      })
    };
  }

  export function edit(historyRecord: IHistoryRecord): IProgress {
    return {
      day: historyRecord.day,
      historyRecord: historyRecord,
      startTime: historyRecord.startTime,
      ui: {},
      entries: historyRecord.entries.map(entry => {
        const firstWeight = entry.sets[0].weight;
        return {
          excercise: entry.excercise,
          sets: entry.sets,
          warmupSets: Excercise.getWarmupSets(entry.excercise, firstWeight)
        };
      })
    };
  }

  export function startTimer(progress: IProgress, timestamp: number, mode: IProgressMode): IProgress {
    return {
      ...progress,
      timerSince: timestamp,
      timerMode: mode
    };
  }

  export function findEntryByExcercise(progress: IProgress, excerciseType: IExcerciseType): IProgressEntry | undefined {
    return progress.entries.find(entry => entry.excercise === excerciseType);
  }

  export function isFullyCompletedSet(progress: IProgress): boolean {
    return progress.entries.every(entry => isCompletedSet(entry));
  }

  export function isCompletedSet(entry: IProgressEntry): boolean {
    return Reps.isCompleted(entry.sets);
  }

  export function isFullyFinishedSet(progress: IProgress): boolean {
    return progress.entries.every(entry => isFinishedSet(entry));
  }

  export function isFinishedSet(entry: IProgressEntry): boolean {
    return Reps.isFinished(entry.sets);
  }

  export function showUpdateWeightModal(progress: IProgress, excercise: IExcerciseType, weight: IWeight): IProgress {
    return {
      ...progress,
      ui: {
        ...progress.ui,
        weightModal: {
          excercise,
          weight
        }
      }
    };
  }

  export function showUpdateDate(progress: IProgress, date: string): IProgress {
    return {
      ...progress,
      ui: {
        ...progress.ui,
        dateModal: {
          date
        }
      }
    };
  }

  export function changeDate(progress: IProgress, date?: string): IProgress {
    const historyRecord = progress.historyRecord;
    if (historyRecord != null) {
      return {
        ...progress,
        historyRecord: {
          ...historyRecord,
          ...(date != null ? { date: DateUtils.fromYYYYMMDD(date) } : {})
        },
        ui: {
          ...progress.ui,
          dateModal: undefined
        }
      };
    } else {
      return progress;
    }
  }

  export function updateRepsInExcercise(
    progress: IProgress,
    excercise: IExcerciseType,
    weight: IWeight,
    setIndex: number,
    mode: IProgressMode
  ): IProgress {
    if (mode === "warmup") {
      const firstWeight = progress.entries.find(e => e.excercise === excercise)?.sets[0]?.weight;
      if (firstWeight != null) {
        return {
          ...progress,
          entries: progress.entries.map(progressEntry => {
            if (progressEntry.excercise === excercise) {
              const progressSets = progressEntry.warmupSets;
              const progressSet = progressSets[setIndex];
              if (progressSet?.completedReps == null) {
                progressSets[setIndex] = { ...progressSet, completedReps: progressSet.reps as number, weight };
              } else if (progressSet.completedReps > 0) {
                progressSets[setIndex] = {
                  ...progressSet,
                  completedReps: progressSet.completedReps - 1,
                  weight
                };
              } else {
                progressSets[setIndex] = { ...progressSet, completedReps: undefined, weight };
              }
              return { ...progressEntry, warmupSets: progressSets };
            } else {
              return progressEntry;
            }
          })
        };
      } else {
        return progress;
      }
    } else {
      const entry = progress.entries.find(e => e.excercise === excercise)!;
      if (entry.sets[setIndex].reps === "amrap") {
        const amrapUi: IProgressUi = { amrapModal: { excercise, setIndex, weight } };
        return {
          ...progress,
          ui: {
            ...progress.ui,
            ...amrapUi
          }
        };
      } else {
        return {
          ...progress,
          entries: progress.entries.map(progressEntry => {
            if (progressEntry.excercise === excercise) {
              const sets = [...progressEntry.sets];
              const set = sets[setIndex];
              if (set.completedReps == null) {
                sets[setIndex] = {
                  ...set,
                  completedReps: set.reps as number,
                  weight,
                  timestamp: set.timestamp ?? Date.now()
                };
              } else if (set.completedReps > 0) {
                sets[setIndex] = {
                  ...set,
                  completedReps: set.completedReps - 1,
                  weight,
                  timestamp: set.timestamp ?? Date.now()
                };
              } else {
                sets[setIndex] = { ...set, completedReps: undefined, weight, timestamp: set.timestamp ?? Date.now() };
              }
              return { ...progressEntry, sets: sets };
            } else {
              return progressEntry;
            }
          })
        };
      }
    }
  }

  export function updateAmrapRepsInExcercise(progress: IProgress, value?: number): IProgress {
    if (progress.ui.amrapModal != null) {
      const { excercise, setIndex, weight } = progress.ui.amrapModal;
      return {
        ...progress,
        ui: { ...progress.ui, amrapModal: undefined },
        entries: progress.entries.map(progressEntry => {
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
        })
      };
    } else {
      return progress;
    }
  }

  export function updateWeight(progress: IProgress, weight?: IWeight): IProgress {
    if (progress.ui.weightModal != null) {
      const { excercise, weight: previousWeight } = progress.ui.weightModal;
      return {
        ...progress,
        ui: { ...progress.ui, weightModal: undefined },
        entries: progress.entries.map(progressEntry => {
          if (progressEntry.excercise === excercise) {
            const firstWeight = progressEntry.sets[0]?.weight;
            return {
              ...progressEntry,
              sets: progressEntry.sets.map(set => {
                if (set.weight === previousWeight && weight != null) {
                  return { ...set, weight: Weight.round(weight) };
                } else {
                  return set;
                }
              }),
              warmupSets:
                firstWeight === previousWeight && weight != null
                  ? Excercise.getWarmupSets(excercise, weight)
                  : progressEntry.warmupSets
            };
          } else {
            return progressEntry;
          }
        })
      };
    } else {
      return progress;
    }
  }
}
