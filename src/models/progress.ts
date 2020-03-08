import { IHistoryEntry } from "./history";
import { IProgram, Program } from "./program";
import { IExcercise } from "./excercise";
import { StateError } from "../ducks/stateError";

export interface IProgress {
  day: number;
  entries: IHistoryEntry[];
}

export namespace Progress {
  export function create(program: IProgram, day: number): IProgress {
    const programDay = program.days[day];
    return {
      day,
      entries: programDay.excercises.map(excercise => {
        return {
          weight: excercise.excercise.startWeight,
          excercise: excercise.excercise,
          reps: []
        };
      })
    };
  }

  export function updateRepsInExcercise(
    progress: IProgress,
    program: IProgram,
    excercise: IExcercise,
    setIndex: number
  ): IProgress {
    const day = progress.day;
    return {
      ...progress,
      entries: progress.entries.map(historyEntry => {
        if (historyEntry.excercise.name === excercise.name) {
          const reps = [...historyEntry.reps];
          const set = reps[setIndex];
          if (set == null) {
            const programSet = Program.getSetForExcercise(program, day, excercise, setIndex);
            if (programSet === "amrap") {
              throw new StateError("Can't update AMRAP reps");
            } else if (programSet == null) {
              throw new StateError(
                `Can't find reps for set ${setIndex} of ${excercise.name} in ${program.name} (day ${day})`
              );
            } else {
              reps[setIndex] = programSet;
            }
          } else if (set > 0) {
            reps[setIndex] = set - 1;
          } else {
            reps[setIndex] = undefined;
          }
          return { ...historyEntry, reps };
        } else {
          return historyEntry;
        }
      })
    };
  }
}
