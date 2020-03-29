import { IProgram, Program, IProgramId } from "./program";
import { IExcercise, IExcerciseType } from "./excercise";
import { StateError } from "../ducks/stateError";
import { IProgressSets, Reps } from "./set";
import { IWeight } from "./weight";

export interface IProgress {
  day: number;
  entries: IProgressEntry[];
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
    return {
      ...progress,
      entries: progress.entries.map(historyEntry => {
        if (historyEntry.excercise.name === excercise.name) {
          const reps = [...historyEntry.sets];
          const set = reps[setIndex];
          if (set == null) {
            const programSet = Program.getSetForExcercise(program, day, excercise, setIndex);
            if (programSet != null) {
              if (programSet.reps === "amrap") {
                throw new StateError("Can't update AMRAP reps");
              } else {
                reps[setIndex] = { reps: programSet.reps, weight };
              }
            } else {
              throw new StateError(
                `Can't find reps for set ${setIndex} of ${excercise.name} in ${program.name} (day ${day})`
              );
            }
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
}
