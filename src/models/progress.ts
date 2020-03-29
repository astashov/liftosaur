import { IProgram, Program, IProgramId } from "./program";
import { IExcercise, IExcerciseType } from "./excercise";
import { IProgressSets, Reps } from "./set";
import { IWeight } from "./weight";

export interface IProgress {
  day: number;
  ui: IProgressUi;
  entries: IProgressEntry[];
}

export interface IProgressUi {
  amrapModal?: {
    excercise: IExcercise;
    setIndex: number;
    weight: IWeight;
  };
}

export interface IProgressEntry {
  excercise: IExcercise;
  sets: IProgressSets;
}

export namespace Progress {
  export function create(program: IProgram, day: number): IProgress {
    const programDay = program.days[day];
    return {
      day,
      ui: {},
      entries: programDay.excercises.map(excercise => {
        return {
          excercise: excercise.excercise,
          sets: []
        };
      })
    };
  }

  export function findEntryByExcercise(progress: IProgress, excerciseType: IExcerciseType): IProgressEntry | undefined {
    return progress.entries.find(entry => entry.excercise.id === excerciseType);
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

  export function isCompletedSet(progress: IProgress, program: IProgram, excercise: IExcercise): boolean {
    const progressEntry = Progress.findEntryByExcercise(progress, excercise.id);
    const programExcercise = Program.findExcercise(program, progress.day, excercise.id);
    if (progressEntry && programExcercise) {
      return Reps.isCompleted(progressEntry.sets, programExcercise.sets);
    } else {
      return false;
    }
  }

  export function updateRepsInExcercise(
    progress: IProgress,
    programName: IProgramId,
    excercise: IExcercise,
    weight: IWeight,
    setIndex: number
  ): IProgress {
    const day = progress.day;
    const program = Program.get(programName);
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
          entries: progress.entries.map(historyEntry => {
            if (historyEntry.excercise.name === excercise.name) {
              const reps = [...historyEntry.sets];
              const set = reps[setIndex];
              if (set == null) {
                reps[setIndex] = { reps: programSetReps, weight };
              } else if (set.reps > 0) {
                reps[setIndex] = { reps: set.reps - 1, weight };
              } else {
                reps[setIndex] = undefined;
              }
              return { ...historyEntry, sets: reps };
            } else {
              return historyEntry;
            }
          })
        };
      }
    } else {
      return progress;
    }
  }

  export function updateAmrapRepsInExcercise(progress: IProgress, value?: number): IProgress {
    if (progress.ui.amrapModal != null) {
      const { excercise, setIndex, weight } = progress.ui.amrapModal;
      return {
        ...progress,
        ui: { ...progress.ui, amrapModal: undefined },
        entries: progress.entries.map(historyEntry => {
          if (historyEntry.excercise.id === excercise.id) {
            const reps = [...historyEntry.sets];
            if (value == null) {
              reps[setIndex] = undefined;
            } else {
              reps[setIndex] = { reps: value, weight };
            }
            return { ...historyEntry, sets: reps };
          } else {
            return historyEntry;
          }
        })
      };
    } else {
      return progress;
    }
  }
}
