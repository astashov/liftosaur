import { IProgram, Program, IProgramId } from "./program";
import { IExcercise, IExcerciseType, Excercise } from "./excercise";
import { Reps, IProgressSet } from "./set";
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
  sets: IProgressSet[];
  mode: IProgressMode;
  warmupSets: IProgressSet[];
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
          mode: "warmup",
          excercise: excercise.excercise,
          sets: excercise.sets.map(set => {
            const weight = set.weight(stats, day);
            const increment = program.increment(stats, day, excercise.excercise);
            const newWeight = weight + increment;
            return { reps: undefined, weight: newWeight };
          }),
          warmupSets: Excercise.getWarmupProgressSets(excercise.excercise, firstWeight)
        };
      })
    };
  }

  export function findEntryByExcercise(progress: IProgress, excerciseType: IExcerciseType): IProgressEntry | undefined {
    return progress.entries.find(entry => entry.excercise === excerciseType);
  }

  export function isEmptySet(progress: IProgress, program: IProgram, excercise: IExcercise): boolean {
    const progressEntry = Progress.findEntryByExcercise(progress, excercise.id);
    const programExcercise = Program.findExcercise(program, progress.day, excercise.id);
    if (progressEntry && programExcercise) {
      return Reps.isEmpty(progressEntry.sets, programExcercise.sets);
    } else {
      return false;
    }
  }

  export function isCompletedSet(progress: IProgress, program: IProgram, excercise: IExcerciseType): boolean {
    const progressEntry = Progress.findEntryByExcercise(progress, excercise);
    const programExcercise = Program.findExcercise(program, progress.day, excercise);
    if (progressEntry && programExcercise) {
      return Reps.isCompleted(progressEntry.sets, programExcercise.sets);
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
        const warmupSets = Excercise.getWarmupSets(excercise, firstWeight);
        return {
          ...progress,
          entries: progress.entries.map(progressEntry => {
            if (progressEntry.excercise === excercise) {
              const progressSets = progressEntry.warmupSets;
              const progressSet = progressSets[setIndex];
              const warmupSet = warmupSets[setIndex];
              if (progressSet?.reps == null) {
                progressSets[setIndex] = { reps: warmupSet.reps, weight };
              } else if (progressSet.reps > 0) {
                progressSets[setIndex] = { reps: progressSet.reps - 1, weight };
              } else {
                progressSets[setIndex] = { reps: undefined, weight };
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
                if (set.reps == null) {
                  sets[setIndex] = { reps: programSetReps, weight };
                } else if (set.reps > 0) {
                  sets[setIndex] = { reps: set.reps - 1, weight };
                } else {
                  sets[setIndex] = { reps: undefined, weight };
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
            if (value == null) {
              sets[setIndex] = { reps: undefined, weight };
            } else {
              sets[setIndex] = { reps: value, weight };
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
            return {
              ...progressEntry,
              sets: progressEntry.sets.map(set => {
                if (set.weight === previousWeight && weight != null) {
                  return { ...set, weight: Weight.round(weight) };
                } else {
                  return set;
                }
              })
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
