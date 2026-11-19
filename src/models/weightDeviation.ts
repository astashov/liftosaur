import { IHistoryEntry, ISet, ISettings, IWeight } from "../types";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { PlannerProgramExercise_getUpdateScript } from "../pages/planner/models/plannerProgramExercise";
import { ScriptRunner } from "../parser";
import { Weight_convertTo, Weight_eq, Weight_is } from "./weight";

export interface IWeightDeviation {
  setIndex: number;
  setId: string;
  programSetIndex: number;
  targetWeight: IWeight;
  completedWeight: IWeight;
  ratio: number;
}

export function WeightDeviation_hint(
  entry: IHistoryEntry,
  programExercise: IPlannerProgramExercise | undefined,
  settings: ISettings
): IWeightDeviation | undefined {
  if (programExercise == null || !WeightDeviation_isScriptEligible(programExercise)) {
    return undefined;
  }
  const setIndex = lastCompletedSetIndex(entry.sets);
  if (setIndex == null) {
    return undefined;
  }
  const set = entry.sets[setIndex];
  const { programSetIndex, originalWeight, weight, completedWeight } = set;
  if (
    programSetIndex == null ||
    entry.sets.filter((s) => s.programSetIndex === programSetIndex).length > 1 ||
    set.askWeight ||
    !Weight_is(originalWeight) ||
    originalWeight.value <= 0 ||
    weight == null ||
    completedWeight == null ||
    Weight_eq(completedWeight, weight)
  ) {
    return undefined;
  }
  return {
    setIndex,
    setId: set.id,
    programSetIndex,
    targetWeight: weight,
    completedWeight,
    ratio: Weight_convertTo(completedWeight, originalWeight.unit).value / originalWeight.value,
  };
}

export function WeightDeviation_isScriptEligible(programExercise: IPlannerProgramExercise): boolean {
  const updateScript = PlannerProgramExercise_getUpdateScript(programExercise) ?? "";
  return (
    ScriptRunner.assignmentOps(updateScript, "weights").length === 0 &&
    !ScriptRunner.callsFunction(updateScript, "sets")
  );
}

function lastCompletedSetIndex(sets: ISet[]): number | undefined {
  for (let i = sets.length - 1; i >= 0; i--) {
    if (sets[i].isCompleted) {
      return i;
    }
  }
  return undefined;
}
