import { IPlannerProgramExerciseEvaluatedSet } from "../pages/planner/models/types";
import { IProgramSet, ISettings } from "../types";

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

  export function approxTimeMs(set: IPlannerProgramExerciseEvaluatedSet, settings: ISettings): number {
    const reps = set.maxrep;
    const secondsPerRep = 7;
    const prepareTime = 20;
    const timeToRep = (prepareTime + (reps ?? 0) * secondsPerRep) * 1000;
    const timeToRest = (settings.timers.workout || 0) * 1000;
    const totalTime = timeToRep + timeToRest;
    return totalTime;
  }

  export function isEqual(set1: IProgramSet, set2: IProgramSet): boolean {
    return (
      set1.weightExpr === set2.weightExpr &&
      !!set1.askWeight === !!set2.askWeight &&
      set1.repsExpr === set2.repsExpr &&
      set1.minRepsExpr === set2.minRepsExpr &&
      !!set1.isAmrap === !!set2.isAmrap &&
      set1.rpeExpr === set2.rpeExpr &&
      !!set1.logRpe === !!set2.logRpe
    );
  }
}
