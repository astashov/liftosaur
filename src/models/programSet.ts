import { IPlannerProgramExerciseEvaluatedSet } from "../pages/planner/models/types";
import { IExerciseType, IProgramSet, ISettings, IWeight } from "../types";
import { Equipment_getUnitOrDefaultForExerciseType } from "./equipment";
import { Weight_evaluateWeight, Weight_rpePct, Weight_roundConvertTo } from "./weight";

export function ProgramSet_group(sets: IProgramSet[]): IProgramSet[][] {
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

export function ProgramSet_approxSetTimeMs(reps: number | undefined, restTimer: number): number {
  const secondsPerRep = 7;
  const prepareTime = 20;
  const timeToRep = (prepareTime + (reps ?? 0) * secondsPerRep) * 1000;
  const timeToRest = restTimer * 1000;
  return timeToRep + timeToRest;
}

export function ProgramSet_approxRestTimer(
  set: Pick<IPlannerProgramExerciseEvaluatedSet, "timer">,
  restTimer: number,
  supersetTimer?: number
): number {
  return set.timer ?? supersetTimer ?? restTimer;
}

export function ProgramSet_approxTimeMs(
  set: IPlannerProgramExerciseEvaluatedSet,
  settings: ISettings,
  isSuperset?: boolean
): number {
  const supersetTimer = isSuperset ? (settings.timers.superset ?? undefined) : undefined;
  const restTimer = ProgramSet_approxRestTimer(set, settings.timers.workout || 0, supersetTimer);
  return ProgramSet_approxSetTimeMs(set.maxrep, restTimer);
}

export function ProgramSet_isEligibleForInferredWeight(set: IPlannerProgramExerciseEvaluatedSet): boolean {
  return set.weight == null && set.maxrep != null && set.rpe != null;
}

export function ProgramSet_getEvaluatedWeight(
  programSet: IPlannerProgramExerciseEvaluatedSet,
  exerciseType: IExerciseType,
  settings: ISettings
): IWeight | undefined {
  const originalWeight = programSet.weight;
  const unit = Equipment_getUnitOrDefaultForExerciseType(settings, exerciseType);
  const evaluatedWeight = originalWeight
    ? Weight_evaluateWeight(originalWeight, exerciseType, settings)
    : ProgramSet_isEligibleForInferredWeight(programSet) && programSet.maxrep != null && programSet.rpe != null
      ? Weight_evaluateWeight(Weight_rpePct(programSet.maxrep, programSet.rpe), exerciseType, settings)
      : undefined;
  return evaluatedWeight ? Weight_roundConvertTo(evaluatedWeight, settings, unit, exerciseType) : undefined;
}
