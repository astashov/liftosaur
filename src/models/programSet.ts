import { IProgramSet, IProgramExercise, ISettings } from "../types";
import { ProgramExercise } from "./programExercise";
import { Progress } from "./progress";

export namespace ProgramSet {
  export function group(sets: IProgramSet[]): IProgramSet[][] {
    return sets.reduce<IProgramSet[][]>(
      (memo, set) => {
        let lastGroup = memo[memo.length - 1];
        const last = lastGroup[lastGroup.length - 1];
        if (
          last != null &&
          (last.weightExpr !== set.weightExpr ||
            last.repsExpr !== set.repsExpr ||
            last.isAmrap !== set.isAmrap ||
            last.rpeExpr !== set.rpeExpr ||
            last.logRpe !== set.logRpe)
        ) {
          memo.push([]);
          lastGroup = memo[memo.length - 1];
        }
        lastGroup.push(set);
        return memo;
      },
      [[]]
    );
  }

  export function approxTimeMs(
    set: IProgramSet,
    dayIndex: number,
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[],
    settings: ISettings
  ): number {
    const reps = Progress.executeEntryScript(
      set.repsExpr,
      dayIndex,
      ProgramExercise.getState(programExercise, allProgramExercises),
      { equipment: programExercise.exerciseType.equipment },
      settings,
      "reps"
    );
    const secondsPerRep = 7;
    const prepareTime = 20;
    const timeToRep = (prepareTime + reps * secondsPerRep) * 1000;
    const timeToRest = (settings.timers.workout || 0) * 1000;
    const totalTime = timeToRep + timeToRest;
    return totalTime;
  }
}
