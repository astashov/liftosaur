import { IPlannerProgramExerciseEvaluatedSet } from "../pages/planner/models/types";
import { IExerciseType, IProgramSet, ISettings, IWeight } from "../types";
import { Equipment } from "./equipment";
import { Weight } from "./weight";

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

  export function isEligibleForInferredWeight(set: IPlannerProgramExerciseEvaluatedSet): boolean {
    return set.weight == null && set.maxrep != null && set.rpe != null;
  }

  export function getEvaluatedWeight(
    programSet: IPlannerProgramExerciseEvaluatedSet,
    exerciseType: IExerciseType,
    settings: ISettings
  ): IWeight | undefined {
    const originalWeight = programSet.weight;
    const unit = Equipment.getUnitOrDefaultForExerciseType(settings, exerciseType);
    const evaluatedWeight = originalWeight
      ? Weight.evaluateWeight(originalWeight, exerciseType, settings)
      : ProgramSet.isEligibleForInferredWeight(programSet) && programSet.maxrep != null && programSet.rpe != null
        ? Weight.evaluateWeight(Weight.rpePct(programSet.maxrep, programSet.rpe), exerciseType, settings)
        : undefined;
    return evaluatedWeight ? Weight.roundConvertTo(evaluatedWeight, settings, unit, exerciseType) : undefined;
  }
}
