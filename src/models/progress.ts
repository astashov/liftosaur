import { IProgram, Program, IProgramId } from "./program";
import { IExcercise, IExcerciseType, Excercise } from "./excercise";
import { Reps, ISet } from "./set";
import { IWeight, Weight } from "./weight";
import { IStats } from "./stats";

export interface IProgress {
  day: number;
  ui: IProgressUi;
  entries: IProgressEntry[];
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
}

export type IProgressMode = "warmup" | "workout";

export interface IProgressEntry {
  excercise: IExcerciseType;
  sets: ISet[];
  warmupSets: ISet[];
}

export namespace Progress {
  export function create(program: IProgram, day: number, stats: IStats): IProgress {
    const programDay = program.days[day];
    return {
      day,
      ui: {},
      entries: programDay.excercises.map(excercise => {
        const firstWeight = excercise.sets[0].weight(stats, day);
        return {
          excercise: excercise.excercise,
          sets: excercise.sets.map(set => {
            const weight = set.weight(stats, day);
            const increment = program.increment(stats, day, excercise.excercise);
            const newWeight = weight + increment;
            return { completedReps: undefined, reps: set.reps, weight: newWeight };
          }),
          warmupSets: Excercise.getWarmupSets(excercise.excercise, firstWeight)
        };
      })
    };
  }

  export function findEntryByExcercise(progress: IProgress, excerciseType: IExcerciseType): IProgressEntry | undefined {
    return progress.entries.find(entry => entry.excercise === excerciseType);
  }

  export function isEmptySet(progress: IProgress, excercise: IExcercise): boolean {
    const progressEntry = Progress.findEntryByExcercise(progress, excercise.id);
    if (progressEntry) {
      return Reps.isEmpty(progressEntry.sets);
    } else {
      return false;
    }
  }

  export function isCompletedSet(progress: IProgress, excercise: IExcerciseType): boolean {
    const progressEntry = Progress.findEntryByExcercise(progress, excercise);
    if (progressEntry) {
      return Reps.isCompleted(progressEntry.sets);
    } else {
      return false;
    }
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

  export function updateRepsInExcercise(
    progress: IProgress,
    programName: IProgramId,
    excercise: IExcerciseType,
    weight: IWeight,
    setIndex: number,
    mode: IProgressMode
  ): IProgress {
    const day = progress.day;
    const program = Program.get(programName);
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
      const programSet = Program.getSetForExcercise(program, day, excercise, setIndex);
      if (programSet != null) {
        const programSetReps = programSet.reps;
        if (programSetReps === "amrap") {
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
                  sets[setIndex] = { ...set, completedReps: programSetReps, weight };
                } else if (set.completedReps > 0) {
                  sets[setIndex] = { ...set, completedReps: set.completedReps - 1, weight };
                } else {
                  sets[setIndex] = { ...set, completedReps: undefined, weight };
                }
                return { ...progressEntry, sets: sets };
              } else {
                return progressEntry;
              }
            })
          };
        }
      } else {
        return progress;
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
