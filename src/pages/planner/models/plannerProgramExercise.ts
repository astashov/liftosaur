import {
  IPlannerProgramExercise,
  IPlannerProgramExerciseEvaluatedSet,
  IPlannerProgramExerciseEvaluatedSetVariation,
  IPlannerProgramExerciseGlobals,
  IPlannerProgramExerciseSet,
  IPlannerProgramExerciseSetVariation,
  IPlannerProgramExerciseWithType,
  IPlannerProgramExerciseWarmupSet,
  IProgramExerciseProgress,
  IProgramExerciseProgressType,
} from "./types";
import { IPlannerEvalResult, PlannerExerciseEvaluator } from "../plannerExerciseEvaluator";
import { ObjectUtils_clone, ObjectUtils_filter, ObjectUtils_values } from "../../../utils/object";
import { groupDisplaySets } from "../../../components/historyRecordSets";
import {
  Weight_rpeMultiplier,
  Weight_build,
  Weight_buildPct,
  Weight_display,
  Weight_zero,
  Weight_eq,
  Weight_parsePct,
  Weight_isPct,
} from "../../../models/weight";
import {
  IDayData,
  IHistoryEntry,
  IPercentage,
  IProgramExerciseWarmupSet,
  IProgramState,
  IProgramStateMetadata,
  ISettings,
  IWeight,
} from "../../../types";
import {
  equipmentName,
  IExercise,
  warmupValues,
  Exercise_findByName,
  Exercise_get,
  Exercise_fullName,
} from "../../../models/exercise";
import { ProgramExercise_groupWarmupsSets } from "../../../models/programExercise";
import { MathUtils_roundTo0005 } from "../../../utils/math";
import { UidFactory_generateUid } from "../../../utils/generator";
import { PlannerKey_fromExerciseType } from "../plannerKey";
import { CollectionUtils_compact, CollectionUtils_groupByExpr } from "../../../utils/collection";
import { IEither } from "../../../utils/types";
import { IDisplaySet } from "../../../models/set";

export type ILinearProgressionType = {
  type: "linear";
  increase: IWeight | IPercentage;
  successesRequired?: number;
  successesCounter?: number;
  decrease?: IWeight | IPercentage;
  failuresRequired?: number;
  failuresCounter?: number;
};
export type IDoubleProgressionType = {
  type: "double";
  increase: IWeight | IPercentage;
  minReps: number;
  maxReps: number;
};
export type ISumRepsProgressionType = {
  type: "sumreps";
  increase: IWeight | IPercentage;
  reps: number;
};
export type ICustomProgressionType = {
  type: "custom";
};
export type IProgressionType =
  | ILinearProgressionType
  | IDoubleProgressionType
  | ISumRepsProgressionType
  | ICustomProgressionType;

export function PlannerProgramExercise_numberOfSets(exercise: IPlannerProgramExercise): number {
  return PlannerProgramExercise_sets(exercise).reduce((acc, set) => acc + (set.repRange?.numberOfSets || 0), 0);
}

export function PlannerProgramExercise_getExercise(
  plannerExercise: IPlannerProgramExercise,
  settings: ISettings
): IExercise | undefined {
  const exercise = Exercise_findByName(plannerExercise.name, settings.exercises);
  if (exercise == null) {
    return undefined;
  }
  exercise.equipment = plannerExercise.equipment || exercise?.equipment || exercise?.defaultEquipment;
  return exercise;
}

export function PlannerProgramExercise_setVariations(
  exercise: IPlannerProgramExercise
): IPlannerProgramExerciseSetVariation[] {
  const originalSetVariations = exercise.setVariations;
  const reuseSetVariations = exercise.reuse?.exercise?.setVariations;
  const setVariations = (originalSetVariations?.length > 0 ? originalSetVariations : reuseSetVariations) || [];
  return setVariations.length === 0
    ? [{ sets: PlannerProgramExercise_sets(exercise), isCurrent: true }]
    : setVariations;
}

export function PlannerProgramExercise_warmups(
  exercise: IPlannerProgramExercise
): IPlannerProgramExerciseWarmupSet[] | undefined {
  return exercise.warmupSets || exercise.reuse?.exercise?.warmupSets;
}

export function PlannerProgramExercise_programWarmups(
  exercise: IPlannerProgramExercise,
  settings: ISettings
): IProgramExerciseWarmupSet[] | undefined {
  const exerciseWarmups = PlannerProgramExercise_warmups(exercise);
  if (exerciseWarmups == null) {
    return undefined;
  }
  const sets: IProgramExerciseWarmupSet[] = [];
  for (const ws of exerciseWarmups) {
    for (let i = 0; i < ws.numberOfSets; i += 1) {
      let value: IWeight | number | undefined = ws.percentage ? ws.percentage / 100 : undefined;
      if (value == null) {
        value = ws.weight;
      }
      if (value == null) {
        value = MathUtils_roundTo0005(Weight_rpeMultiplier(ws.reps, 4));
      }
      sets.push({
        reps: ws.reps,
        value,
        threshold: Weight_build(0, settings.units),
      });
    }
  }
  return sets;
}

export function PlannerProgramExercise_toUsed(
  exercise?: IPlannerProgramExercise
): IPlannerProgramExerciseWithType | undefined {
  if (exercise?.exerciseType != null) {
    return exercise as IPlannerProgramExerciseWithType;
  } else {
    return undefined;
  }
}

export function PlannerProgramExercise_evaluateSetVariations(
  exercise: IPlannerProgramExercise,
  setVariations: IPlannerProgramExerciseSetVariation[]
): IPlannerProgramExerciseEvaluatedSetVariation[] {
  const evaluatedSetVariations: IPlannerProgramExerciseEvaluatedSetVariation[] = [];
  for (let i = 0; i < setVariations.length; i++) {
    const sets = PlannerProgramExercise_sets(exercise, i);
    const evaluatedSets: IPlannerProgramExerciseEvaluatedSet[] = [];
    for (const aSet of sets) {
      if (aSet.repRange == null) {
        continue;
      }
      for (let j = 0; j < aSet.repRange.numberOfSets; j++) {
        evaluatedSets.push({
          maxrep: aSet.repRange.maxrep,
          minrep: aSet.repRange.minrep,
          weight: aSet.weight ? aSet.weight : aSet.percentage ? Weight_buildPct(aSet.percentage) : undefined,
          timer: aSet.timer,
          rpe: aSet.rpe,
          logRpe: !!aSet.logRpe,
          label: aSet.label,
          isAmrap: !!aSet.repRange.isAmrap,
          isQuickAddSet: !!aSet.repRange.isQuickAddSet,
          askWeight: !!aSet.askWeight,
        });
      }
    }
    evaluatedSetVariations.push({ sets: evaluatedSets, isCurrent: setVariations[i].isCurrent });
  }
  return evaluatedSetVariations;
}

export function PlannerProgramExercise_sets(
  exercise: IPlannerProgramExercise,
  variationIndex?: number
): IPlannerProgramExerciseSet[] {
  const reusedSets = exercise.reuse?.exercise
    ? exercise.reuse?.exercise?.setVariations[
        variationIndex ?? PlannerProgramExercise_currentSetVariationIndex(exercise.reuse?.exercise)
      ]?.sets
    : undefined;
  const reusedGlobals = exercise.reuse?.exercise?.globals || {};
  variationIndex = variationIndex ?? PlannerProgramExercise_currentSetVariationIndex(exercise);
  const currentSets = exercise.setVariations[variationIndex]?.sets;
  const currentGlobals = exercise.globals;
  const sets = currentSets || reusedSets || [];
  return sets.map((aSet) => {
    const set: IPlannerProgramExerciseSet = ObjectUtils_clone(aSet);
    set.rpe = currentGlobals.rpe != null ? currentGlobals.rpe : (set.rpe ?? reusedGlobals.rpe);
    set.timer = currentGlobals.timer != null ? currentGlobals.timer : (set.timer ?? reusedGlobals.timer);
    if (currentGlobals.weight != null || currentGlobals.percentage != null) {
      if (currentGlobals.weight != null) {
        set.weight = currentGlobals.weight;
        set.percentage = undefined;
      } else {
        set.percentage = currentGlobals.percentage;
        set.weight = undefined;
      }
    } else {
      set.weight = set.weight ?? reusedGlobals.weight;
      set.percentage = set.percentage ?? reusedGlobals.percentage;
    }

    set.logRpe = !!(currentGlobals.rpe != null && currentGlobals.logRpe != null
      ? currentGlobals.logRpe
      : (set.logRpe ?? reusedGlobals.logRpe));
    set.askWeight = !!((currentGlobals.weight != null || currentGlobals.percentage != null) &&
    currentGlobals.askWeight != null
      ? currentGlobals.askWeight
      : (set.askWeight ?? reusedGlobals.askWeight));
    return set;
  });
}

export function PlannerProgramExercise_defaultWarmups(
  exercise: IExercise,
  settings: ISettings
): IPlannerProgramExerciseWarmupSet[] {
  const warmupSets = (exercise?.defaultWarmup && warmupValues(settings.units)[exercise.defaultWarmup]) || [];
  const result: IPlannerProgramExerciseWarmupSet[] = [];
  if (warmupSets) {
    const groups = ProgramExercise_groupWarmupsSets(warmupSets);
    for (const group of groups) {
      const first = group[0];
      const length = group[1];
      result.push({
        type: "warmup",
        numberOfSets: length,
        reps: first.reps,
        percentage: typeof first.value === "number" ? first.value * 100 : first.value.value,
      });
    }
  }
  return result;
}

export function PlannerProgramExercise_repeatToRangeStr(plannerExercise: IPlannerProgramExercise): string {
  const repeat = plannerExercise.repeating;
  const ranges: [number, number][] = [];
  for (const rep of repeat) {
    if (ranges.length === 0) {
      ranges.push([rep, rep]);
    }
    const lastRep = ranges[ranges.length - 1][1];
    if (rep <= lastRep + 1) {
      ranges[ranges.length - 1][1] = rep;
    } else {
      ranges.push([rep, rep]);
    }
  }
  return ranges.map((r) => `${r[0]}-${r[1]}`).join(", ");
}

export function PlannerProgramExercise_warmupSetsToDisplaySets(
  sets: IPlannerProgramExerciseWarmupSet[]
): IDisplaySet[][] {
  const displaySets: IDisplaySet[] = [];
  for (const set of sets) {
    for (let setIndex = 0; setIndex < (set.numberOfSets || 0); setIndex++) {
      const weight =
        set.percentage != null
          ? `${set.percentage}%`
          : set.weight?.value != null
            ? set.weight.value.toString()
            : `${Math.round(Weight_rpeMultiplier(set.reps, 10) * 100)}%`;
      displaySets.push({
        reps: `${set.reps}`,
        weight: weight,
      });
    }
  }

  return groupDisplaySets(displaySets);
}

export function PlannerProgramExercise_uniqueKey(exercise: IPlannerProgramExercise): string {
  return `${exercise.key}-${exercise.dayData.week}-${exercise.dayData.dayInWeek}`;
}

export function PlannerProgramExercise_uniqueSetKey(set: IPlannerProgramExerciseEvaluatedSet): string {
  return `${set.minrep}-${set.maxrep}-${set.isAmrap}-${set.weight?.value}${set.weight?.unit}${set.askWeight}-${set.rpe}${set.logRpe}-${set.timer}`;
}

export function PlannerProgramExercise_evaluatedSetsToDisplaySets(
  sets: IPlannerProgramExerciseEvaluatedSet[],
  settings: ISettings
): IDisplaySet[][] {
  const displaySets: IDisplaySet[] = [];
  for (const set of sets) {
    const weight = set.weight ? Weight_display(set.weight, false) : undefined;
    const unit = set.weight?.unit || settings.units;
    displaySets.push({
      dimReps: false,
      dimRpe: !set.logRpe,
      dimWeight: !set.weight,
      dimTimer: set.timer == null,
      reps: `${set.minrep != null ? `${set.minrep}-${set.maxrep}` : `${set.maxrep}`}${set.isAmrap ? "+" : ""}`,
      rpe: set.rpe?.toString(),
      weight,
      unit,
      askWeight: set.askWeight,
      timer: set.timer,
    });
  }
  return groupDisplaySets(displaySets);
}

export function PlannerProgramExercise_setsToDisplaySets(
  sets: IPlannerProgramExerciseSet[],
  hasCurrentSets: boolean,
  globals: IPlannerProgramExerciseGlobals,
  settings: ISettings
): IDisplaySet[][] {
  const displaySets: IDisplaySet[] = [];
  for (const set of sets) {
    for (let setIndex = 0; setIndex < (set.repRange?.numberOfSets || 0); setIndex++) {
      const minReps = set.repRange?.minrep;
      const maxReps = set.repRange?.maxrep || 0;
      const weight =
        set.percentage != null
          ? `${set.percentage}%`
          : set.weight?.value != null
            ? set.weight.value.toString()
            : undefined;
      const unit = set.percentage == null ? set.weight?.unit || settings.units : undefined;
      displaySets.push({
        dimReps: !hasCurrentSets,
        dimRpe: !hasCurrentSets && globals.rpe == null,
        dimWeight: !hasCurrentSets && globals.weight == null && globals.percentage == null,
        dimTimer: !hasCurrentSets && globals.timer == null,
        reps: `${minReps != null ? `${minReps}-` : ""}${maxReps}${set.repRange?.isAmrap ? "+" : ""}`,
        rpe: set.rpe?.toString(),
        weight: weight,
        unit,
        askWeight: set.askWeight,
        timer: set.timer,
      });
    }
  }

  return groupDisplaySets(displaySets);
}

export function PlannerProgramExercise_degroupWarmupSets(
  warmupSets: IPlannerProgramExerciseWarmupSet[]
): IPlannerProgramExerciseWarmupSet[] {
  return warmupSets.reduce<IPlannerProgramExerciseWarmupSet[]>((acc, set) => {
    for (let i = 0; i < set.numberOfSets; i++) {
      acc.push({ ...set, numberOfSets: 1 });
    }
    return acc;
  }, []);
}

export function PlannerProgramExercise_currentSetVariationIndex(exercise: IPlannerProgramExercise): number {
  const index = exercise.setVariations.findIndex((sv) => sv.isCurrent);
  return index === -1 ? 0 : index;
}

export function PlannerProgramExercise_currentEvaluatedSetVariationIndex(exercise: IPlannerProgramExercise): number {
  const index = exercise.evaluatedSetVariations.findIndex((sv) => sv.isCurrent);
  return index === -1 ? 0 : index;
}

export function PlannerProgramExercise_currentEvaluatedSetVariation(
  exercise: IPlannerProgramExercise
): IPlannerProgramExerciseEvaluatedSetVariation {
  const index = PlannerProgramExercise_currentEvaluatedSetVariationIndex(exercise);
  return exercise.evaluatedSetVariations[index];
}

export function PlannerProgramExercise_currentDescription(exercise: IPlannerProgramExercise): string | undefined {
  const index = PlannerProgramExercise_currentDescriptionIndex(exercise);
  return exercise.descriptions.values[index]?.value;
}

export function PlannerProgramExercise_addSet(
  ex: IPlannerProgramExercise,
  setVariationIndex: number,
  settings: ISettings
): IPlannerProgramExercise {
  const evaluatedSetVariation = ex.evaluatedSetVariations[setVariationIndex];
  let lastEvaluatedSet = evaluatedSetVariation.sets[evaluatedSetVariation.sets.length - 1];
  if (lastEvaluatedSet) {
    evaluatedSetVariation.sets = [...evaluatedSetVariation.sets, ObjectUtils_clone(lastEvaluatedSet)];
  } else {
    const originalSets = PlannerProgramExercise_sets(ex, setVariationIndex);
    const lastSet = originalSets[originalSets.length - 1];
    if (lastSet) {
      lastEvaluatedSet = {
        maxrep: lastSet.repRange?.maxrep || 1,
        minrep: lastSet.repRange?.minrep,
        weight: lastSet.weight || Weight_zero,
        logRpe: lastSet.logRpe || false,
        isAmrap: lastSet.repRange?.isAmrap || false,
        isQuickAddSet: lastSet.repRange?.isQuickAddSet || false,
        askWeight: lastSet.askWeight || false,
        rpe: lastSet.rpe,
        timer: lastSet.timer,
        label: lastSet.label,
      };
      evaluatedSetVariation.sets = [...evaluatedSetVariation.sets, ObjectUtils_clone(lastEvaluatedSet)];
    } else {
      evaluatedSetVariation.sets = [
        ...evaluatedSetVariation.sets,
        {
          maxrep: 5,
          weight: Weight_build(100, settings.units),
          isAmrap: false,
          logRpe: false,
          askWeight: false,
          isQuickAddSet: false,
        },
      ];
    }
  }
  return ex;
}

export function PlannerProgramExercise_currentDescriptionIndex(exercise: IPlannerProgramExercise): number {
  const index = exercise.descriptions.values.findIndex((d) => d.isCurrent);
  return index === -1 ? 0 : index;
}

export function PlannerProgramExercise_numberOfSetsThisWeek(exerciseName: string, week: IPlannerEvalResult[]): number {
  return week.reduce((acc, days) => {
    if (days.success) {
      const numberOfSetsThisDay = days.data
        .filter((e) => e.name === exerciseName)
        .reduce((acc2, e) => acc2 + PlannerProgramExercise_numberOfSets(e), 0);
      return acc + numberOfSetsThisDay;
    } else {
      return acc;
    }
  }, 0);
}

export function PlannerProgramExercise_getProgressScript(exercise: IPlannerProgramExercise): string | undefined {
  return (
    exercise.progress?.script ??
    exercise.progress?.reuse?.exercise?.progress?.script ??
    exercise.progress?.reuse?.exercise?.progress?.reuse?.exercise?.progress?.script ??
    exercise.reuse?.exercise?.progress?.script ??
    exercise.reuse?.exercise?.progress?.reuse?.exercise?.progress?.script
  );
}

export function PlannerProgramExercise_isReusingSetsProgress(exercise: IPlannerProgramExercise): boolean {
  const reuseExercise = exercise.reuse?.exercise;
  return (
    reuseExercise?.progress != null &&
    exercise.progress != null &&
    exercise.progress.type === reuseExercise.progress?.type &&
    (exercise.progress.reuse?.fullName === reuseExercise.fullName ||
      exercise.progress.script === reuseExercise.progress.script) &&
    Object.keys(PlannerProgramExercise_getOnlyChangedState(exercise)).length === 0
  );
}

export function PlannerProgramExercise_getState(exercise: IPlannerProgramExercise): IProgramState {
  if (exercise.progress?.state && !exercise.progress.reuse) {
    return exercise.progress.state;
  } else {
    const originalState = exercise.progress?.reuse?.exercise
      ? PlannerProgramExercise_getState(exercise.progress.reuse.exercise)
      : exercise.reuse?.exercise
        ? PlannerProgramExercise_getState(exercise.reuse.exercise)
        : {};

    return { ...originalState, ...exercise.progress?.state };
  }
}

export function PlannerProgramExercise_getOnlyChangedState(exercise: IPlannerProgramExercise): IProgramState {
  const originalState = exercise.progress?.reuse?.exercise
    ? exercise.progress.reuse.exercise.progress?.state || {}
    : exercise.reuse?.exercise
      ? exercise.reuse.exercise.progress?.state || {}
      : {};
  const originalStateMetadata = exercise.progress?.reuse?.exercise
    ? exercise.progress.reuse.exercise.progress?.stateMetadata || {}
    : exercise.reuse?.exercise
      ? exercise.reuse.exercise.progress?.stateMetadata || {}
      : {};
  const state = exercise.progress?.state || {};
  const stateMetadata = exercise.progress?.stateMetadata || {};
  return ObjectUtils_filter(
    state,
    (key, value) =>
      originalState[key] == null ||
      !Weight_eq(originalState[key], value) ||
      originalStateMetadata[key]?.userPrompted !== stateMetadata[key]?.userPrompted
  ) as IProgramState;
}

export function PlannerProgramExercise_getStateMetadata(exercise: IPlannerProgramExercise): IProgramStateMetadata {
  if (exercise.progress?.stateMetadata && !exercise.progress.reuse) {
    return exercise.progress.stateMetadata;
  } else {
    const originalState = exercise.progress?.reuse?.exercise
      ? PlannerProgramExercise_getStateMetadata(exercise.progress.reuse.exercise)
      : exercise.reuse?.exercise
        ? PlannerProgramExercise_getStateMetadata(exercise.reuse.exercise)
        : {};

    return { ...originalState, ...exercise.progress?.stateMetadata };
  }
}

export function PlannerProgramExercise_getUpdateScript(exercise: IPlannerProgramExercise): string | undefined {
  return (
    exercise.update?.script ??
    exercise.update?.reuse?.exercise?.update?.script ??
    exercise.update?.reuse?.exercise?.update?.reuse?.exercise?.update?.script ??
    exercise.reuse?.exercise?.update?.script ??
    exercise.reuse?.exercise?.update?.reuse?.exercise?.update?.script
  );
}

export function PlannerProgramExercise_getEnableRpe(exercise: IPlannerProgramExercise): boolean {
  return exercise.setVariations.some((sv, i) => PlannerProgramExercise_sets(exercise, i).some((s) => s.rpe != null));
}

export function PlannerProgramExercise_getEnableRepRanges(exercise: IPlannerProgramExercise): boolean {
  return exercise.setVariations.some((sv, i) =>
    PlannerProgramExercise_sets(exercise, i).some((s) => s.repRange != null && s.repRange.minrep === s.repRange.maxrep)
  );
}

export function PlannerProgramExercise_getProgressDefaultArgs(type: IProgramExerciseProgressType): string[] {
  switch (type) {
    case "none":
      return [];
    case "lp":
      return ["5lb"];
    case "dp":
      return ["5lb", "8", "12"];
    case "sum":
      return ["30", "5lb"];
    case "custom":
      return [];
  }
}

export function PlannerProgramExercise_buildProgress(
  type: IProgramExerciseProgressType,
  args: string[],
  opts: {
    reuseFullname?: string;
    script?: string;
  } = {}
): IEither<IProgramExerciseProgress, string> {
  switch (type) {
    case "none": {
      return {
        success: true,
        data: {
          type: "none",
          state: {},
          stateMetadata: {},
        },
      };
    }
    case "lp": {
      const increment = args[0] ? Weight_parsePct(args[0]) : Weight_build(0, "lb");
      const decrement = args[3] ? Weight_parsePct(args[3]) : Weight_build(0, "lb");
      const state: IProgramState = {
        increment: increment ?? Weight_build(0, "lb"),
        successes: args[1] ? parseInt(args[1], 10) : 1,
        successCounter: args[2] ? parseInt(args[2], 10) : 0,
        decrement: decrement ?? Weight_build(0, "lb"),
        failures: args[4] ? parseInt(args[4], 10) : (decrement?.value ?? 0) > 0 ? 1 : 0,
        failureCounter: args[5] ? parseInt(args[5], 10) : 0,
      };
      const script = `for (var.i in completedReps) {
if (weights[var.i] == 0 && completedWeights[var.i] != 0) {
  weights[var.i] = completedWeights[var.i]
}
}
if (completedReps >= reps && completedRPE <= RPE) {
state.successCounter += 1
if (state.successCounter >= state.successes) {
  for (var.i in completedReps) {
    weights[var.i] = completedWeights[var.i] + state.increment
  }
  state.successCounter = 0
  state.failureCounter = 0
}
}
if (state.decrement > 0 && state.failures > 0) {
if (!(completedReps >= minReps && completedRPE <= RPE)) {
  state.failureCounter += 1
  if (state.failureCounter >= state.failures) {
    weights -= state.decrement
    state.failureCounter = 0
    state.successCounter = 0
  }
}
}`;
      return {
        success: true,
        data: {
          type: "lp",
          state,
          stateMetadata: {},
          script,
        },
      };
    }
    case "dp": {
      const increment = args[0] ? Weight_parsePct(args[0]) : Weight_build(0, "lb");
      const state: IProgramState = {
        increment: increment ?? Weight_build(0, "lb"),
        minReps: args[1] ? parseInt(args[1], 10) : 0,
        maxReps: args[2] ? parseInt(args[2], 10) : 0,
      };
      const script = `
for (var.i in completedReps) {
if (weights[var.i] == 0 && completedWeights[var.i] != 0) {
  weights[var.i] = completedWeights[var.i]
}
}
if (completedReps >= reps && completedRPE <= RPE) {
if (reps[ns] < state.maxReps) {
  reps += 1
} else {
  reps = state.minReps
  for (var.i in completedReps) {
    weights[var.i] = completedWeights[var.i] + state.increment
  }
}
}`;
      return {
        success: true,
        data: {
          type: "dp",
          state,
          stateMetadata: {},
          script,
        },
      };
    }
    case "sum": {
      const increment = args[1] ? Weight_parsePct(args[1]) : Weight_build(0, "lb");
      const state: IProgramState = {
        reps: args[0] ? parseInt(args[0], 10) : 0,
        increment: increment ?? Weight_build(0, "lb"),
      };
      const script = `for (var.i in completedReps) {
if (weights[var.i] == 0 && completedWeights[var.i] != 0) {
  weights[var.i] = completedWeights[var.i]
}
}
if (sum(completedReps) >= state.reps) {
for (var.i in completedReps) {
  weights[var.i] = completedWeights[var.i] + state.increment
}
}`;
      return {
        success: true,
        data: {
          type: "sum",
          state,
          stateMetadata: {},
          script,
        },
      };
    }
    case "custom": {
      const script = opts.script;
      let errorMessage: string | undefined;
      const { state, stateMetadata } = PlannerExerciseEvaluator.fnArgsToStateVars(args, (message) => {
        errorMessage = message;
      });
      if (errorMessage) {
        return {
          success: false,
          error: errorMessage,
        };
      }
      return {
        success: true,
        data: {
          type: "custom",
          state,
          stateMetadata,
          script,
          reuse: opts.reuseFullname ? { fullName: opts.reuseFullname, source: "specific" } : undefined,
        },
      };
    }
  }
}

export function PlannerProgramExercise_progressionType(
  exercise: IPlannerProgramExercise
): IProgressionType | undefined {
  const progress = exercise.progress;
  if (!progress) {
    return undefined;
  }
  const name = progress.type;
  const state = PlannerProgramExercise_getState(exercise);
  if (name === "lp") {
    return {
      type: "linear",
      increase: state.increment as IWeight,
      successesRequired: state.successes as number,
      successesCounter: state.successCounter as number,
      decrease: state.decrement as IWeight,
      failuresRequired: state.failures as number,
      failuresCounter: state.failureCounter as number,
    };
  } else if (name === "dp") {
    return {
      type: "double",
      increase: state.increment as IWeight,
      minReps: state.minReps as number,
      maxReps: state.maxReps as number,
    };
  } else if (name === "sum") {
    return {
      type: "sumreps",
      increase: state.increment as IWeight,
      reps: state.reps as number,
    };
  } else if (name === "custom") {
    return { type: "custom" };
  }
  return undefined;
}

export function PlannerProgramExercise_shortNameFromFullName(fullName: string, settings: ISettings): string {
  const { name, equipment } = PlannerExerciseEvaluator.extractNameParts(fullName, settings.exercises);
  const shortName = `${name}${equipment ? `, ${equipmentName(equipment)}` : ""}`;
  return shortName;
}

export function PlannerProgramExercise_createExerciseFromEntry(
  entry: IHistoryEntry,
  dayData: Required<IDayData>,
  settings: ISettings,
  index: number
): IPlannerProgramExercise {
  const exerciseType = entry.exercise;
  const exercise = Exercise_get(exerciseType, settings.exercises);
  const fullName = Exercise_fullName(exercise, settings);
  const shortName = PlannerProgramExercise_shortNameFromFullName(fullName, settings);
  const { name, equipment } = PlannerExerciseEvaluator.extractNameParts(fullName, settings.exercises);
  const setVariations: IPlannerProgramExerciseSetVariation[] = [
    {
      isCurrent: false,
      sets: entry.sets.map((set) => ({
        repRange: {
          numberOfSets: 1,
          maxrep: set.completedReps ?? set.reps,
          minrep: set.minReps,
          isAmrap: !!set.isAmrap,
          isQuickAddSet: false,
        },
        timer: set.timer,
        rpe: set.rpe,
        logRpe: set.logRpe,
        percentage: Weight_isPct(set.originalWeight) ? set.originalWeight.value : undefined,
        weight: !Weight_isPct(set.originalWeight) ? (set.completedWeight ?? set.weight) : undefined,
        askWeight: set.askWeight,
      })),
    },
  ];
  const groupedWarmupSets = CollectionUtils_compact(
    ObjectUtils_values(
      CollectionUtils_groupByExpr(entry.warmupSets, (set) => {
        return `${set.completedReps ?? set.reps}-${(set.completedWeight ?? set.weight ?? { value: "" }).value}`;
      })
    )
  );
  const plannerExercise: IPlannerProgramExercise = {
    id: UidFactory_generateUid(8),
    key: PlannerKey_fromExerciseType(exercise),
    fullName,
    shortName,
    dayData,
    exerciseType,
    repeat: [],
    repeating: [],
    exerciseIndex: index,
    order: 0,
    text: "",
    tags: [],
    equipment,
    name,
    line: 1,
    evaluatedSetVariations: [],
    setVariations: setVariations,
    warmupSets: groupedWarmupSets.map((group) => ({
      type: "warmup",
      numberOfSets: group.length,
      reps: group[0]?.completedReps ?? group[0]?.reps ?? 1,
      weight: group[0]?.completedWeight ?? group[0]?.weight,
    })),
    descriptions: { values: [] },
    globals: {},
    points: {
      fullName: { line: 1, offset: 0, from: 0, to: 0 },
    },
  };
  const evaluatedSetVariations = PlannerProgramExercise_evaluateSetVariations(plannerExercise, setVariations);
  plannerExercise.evaluatedSetVariations = evaluatedSetVariations;
  return plannerExercise;
}
