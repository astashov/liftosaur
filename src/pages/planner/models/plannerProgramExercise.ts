import {
  IPlannerProgramExercise,
  IPlannerProgramExerciseEvaluatedSetVariation,
  IPlannerProgramExerciseGlobals,
  IPlannerProgramExerciseSet,
  IPlannerProgramExerciseSetVariation,
  IPlannerProgramExerciseWarmupSet,
  IPlannerProgramProperty,
} from "./types";
import { IPlannerEvalResult, PlannerExerciseEvaluator } from "../plannerExerciseEvaluator";
import { ObjectUtils } from "../../../utils/object";
import { IDisplaySet, groupDisplaySets } from "../../../components/historyRecordSets";
import { Weight } from "../../../models/weight";
import {
  IPercentage,
  IProgramExerciseWarmupSet,
  IProgramState,
  IProgramStateMetadata,
  ISettings,
  IWeight,
} from "../../../types";
import { Exercise, IExercise, warmupValues } from "../../../models/exercise";
import { ProgramExercise } from "../../../models/programExercise";
import { MathUtils } from "../../../utils/math";

export type ILinearProgressionType = {
  type: "linear";
  increase: IWeight | IPercentage;
  successesRequired?: number;
  decrease?: IWeight | IPercentage;
  failuresRequired?: number;
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

export class PlannerProgramExercise {
  public static numberOfSets(exercise: IPlannerProgramExercise): number {
    return PlannerProgramExercise.sets(exercise).reduce((acc, set) => acc + (set.repRange?.numberOfSets || 0), 0);
  }

  public static getExercise(plannerExercise: IPlannerProgramExercise, settings: ISettings): IExercise | undefined {
    const exercise = Exercise.findByName(plannerExercise.name, settings.exercises);
    if (exercise == null) {
      return undefined;
    }
    exercise.equipment = plannerExercise.equipment || exercise?.equipment || exercise?.defaultEquipment;
    return exercise;
  }

  public static setVariations(exercise: IPlannerProgramExercise): IPlannerProgramExerciseSetVariation[] {
    const originalSetVariations = exercise.setVariations;
    const reuseSetVariations = exercise.reuse?.exercise?.setVariations;
    const setVariations = originalSetVariations || reuseSetVariations || [];
    return setVariations.length === 0
      ? [{ sets: PlannerProgramExercise.sets(exercise), isCurrent: true }]
      : setVariations;
  }

  public static warmups(exercise: IPlannerProgramExercise): IPlannerProgramExerciseWarmupSet[] | undefined {
    return exercise.warmupSets || exercise.reuse?.exercise?.warmupSets;
  }

  public static programWarmups(exercise: IPlannerProgramExercise, settings: ISettings): IProgramExerciseWarmupSet[] {
    const sets: IProgramExerciseWarmupSet[] = [];
    for (const ws of PlannerProgramExercise.warmups(exercise) || []) {
      for (let i = 0; i < ws.numberOfSets; i += 1) {
        let value: IWeight | number | undefined = ws.percentage ? ws.percentage / 100 : undefined;
        if (value == null) {
          value = ws.weight;
        }
        if (value == null) {
          value = MathUtils.roundTo0005(Weight.rpeMultiplier(ws.reps, 4));
        }
        sets.push({
          reps: ws.reps,
          value,
          threshold: Weight.build(0, settings.units),
        });
      }
    }
    return sets;
  }

  public static sets(exercise: IPlannerProgramExercise, variationIndex?: number): IPlannerProgramExerciseSet[] {
    const reusedSets = exercise.reuse?.exercise
      ? exercise.reuse?.exercise?.setVariations[
          variationIndex ?? this.currentSetVariationIndex(exercise.reuse?.exercise)
        ]?.sets
      : undefined;
    const reusedGlobals = exercise.reuse?.exercise?.globals || {};
    variationIndex = variationIndex ?? this.currentSetVariationIndex(exercise);
    const currentSets = exercise.setVariations[variationIndex]?.sets;
    const currentGlobals = exercise.globals;
    const sets = currentSets || reusedSets || [];
    return sets.map((aSet) => {
      const set: IPlannerProgramExerciseSet = ObjectUtils.clone(aSet);
      set.rpe = currentGlobals.rpe != null ? currentGlobals.rpe : set.rpe ?? reusedGlobals.rpe;
      set.timer = currentGlobals.timer != null ? currentGlobals.timer : set.timer ?? reusedGlobals.timer;
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
        : set.logRpe ?? reusedGlobals.logRpe);
      set.askWeight = !!((currentGlobals.weight != null || currentGlobals.percentage != null) &&
      currentGlobals.askWeight != null
        ? currentGlobals.askWeight
        : set.askWeight ?? reusedGlobals.askWeight);
      return set;
    });
  }

  public static defaultWarmups(exercise: IExercise, settings: ISettings): IPlannerProgramExerciseWarmupSet[] {
    const warmupSets = (exercise?.defaultWarmup && warmupValues(settings.units)[exercise.defaultWarmup]) || [];
    const result: IPlannerProgramExerciseWarmupSet[] = [];
    if (warmupSets) {
      const groups = ProgramExercise.groupWarmupsSets(warmupSets);
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

  public static repeatToRangeStr(plannerExercise: IPlannerProgramExercise): string {
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

  public static progressToStr(plannerExercise: IPlannerProgramExercise): string {
    const progress = plannerExercise.properties.find((p) => p.name === "progress");
    if (!progress) {
      return "";
    }
    return `${progress.fnName}(${progress.fnArgs.join(", ")})`;
  }

  public static warmupSetsToDisplaySets(sets: IPlannerProgramExerciseWarmupSet[]): IDisplaySet[][] {
    const displaySets: IDisplaySet[] = [];
    for (const set of sets) {
      for (let setIndex = 0; setIndex < (set.numberOfSets || 0); setIndex++) {
        const weight =
          set.percentage != null
            ? `${set.percentage}%`
            : set.weight?.value != null
            ? set.weight.value.toString()
            : `${Math.round(Weight.rpeMultiplier(set.reps, 10) * 100)}%`;
        displaySets.push({
          reps: `${set.reps}`,
          weight: weight,
        });
      }
    }

    return groupDisplaySets(displaySets);
  }

  public static setsToDisplaySets(
    sets: IPlannerProgramExerciseSet[],
    hasCurrentSets: boolean,
    globals: IPlannerProgramExerciseGlobals,
    settings: ISettings
  ): IDisplaySet[][] {
    const displaySets: IDisplaySet[] = [];
    for (const set of sets) {
      for (let setIndex = 0; setIndex < (set.repRange?.numberOfSets || 0); setIndex++) {
        const minReps = set.repRange?.minrep || 0;
        const maxReps = set.repRange?.maxrep || 0;
        const weight =
          set.percentage != null
            ? `${set.percentage}%`
            : set.weight?.value != null
            ? set.weight.value.toString()
            : `${Math.round(Weight.rpeMultiplier(maxReps, set.rpe || 10) * 100)}%`;
        const unit = set.percentage == null ? set.weight?.unit || settings.units : undefined;
        displaySets.push({
          dimReps: !hasCurrentSets,
          dimRpe: !hasCurrentSets && globals.rpe == null,
          dimWeight: !hasCurrentSets && globals.weight == null && globals.percentage == null,
          dimTimer: !hasCurrentSets && globals.timer == null,
          reps: `${minReps !== maxReps ? `${minReps}-` : ""}${maxReps}${set.repRange?.isAmrap ? "+" : ""}`,
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

  public static currentSetVariationIndex(exercise: IPlannerProgramExercise): number {
    const index = exercise.setVariations.findIndex((sv) => sv.isCurrent);
    return index === -1 ? 0 : index;
  }

  public static currentEvaluatedSetVariation(
    exercise: IPlannerProgramExercise
  ): IPlannerProgramExerciseEvaluatedSetVariation {
    const index = this.currentSetVariationIndex(exercise);
    return exercise.evaluatedSetVariations[index];
  }

  public static currentDescription(exercise: IPlannerProgramExercise): string | undefined {
    return exercise.descriptions.find((d) => d.isCurrent)?.value;
  }

  public static currentDescriptionIndex(exercise: IPlannerProgramExercise): number {
    const index = exercise.descriptions.findIndex((d) => d.isCurrent);
    return index === -1 ? 0 : index;
  }

  public static numberOfSetsThisWeek(exerciseName: string, week: IPlannerEvalResult[]): number {
    return week.reduce((acc, days) => {
      if (days.success) {
        const numberOfSetsThisDay = days.data
          .filter((e) => e.name === exerciseName)
          .reduce((acc2, e) => acc2 + PlannerProgramExercise.numberOfSets(e), 0);
        return acc + numberOfSetsThisDay;
      } else {
        return acc;
      }
    }, 0);
  }

  public static getState(exercise: IPlannerProgramExercise): IProgramState {
    const progress = exercise.properties.find((p) => p.name === "progress");
    if (!progress) {
      return {};
    }
    return this.getStateFromProperty(progress);
  }

  public static getStateFromProperty(property: IPlannerProgramProperty): IProgramState {
    if (property.reuse) {
      return this.getStateFromProperty(property.reuse);
    }
    const fnArgs = property.fnArgs;
    if (property.fnName === "custom") {
      return PlannerExerciseEvaluator.fnArgsToStateVars(property.fnArgs, () => undefined);
    } else if (property.fnName === "lp") {
      const increment = fnArgs[0] ? Weight.parse(fnArgs[0]) : Weight.build(0, "lb");
      const decrement = fnArgs[3] ? Weight.parse(fnArgs[3]) : Weight.build(0, "lb");
      return {
        increment: increment ?? Weight.build(0, "lb"),
        successes: fnArgs[2] ? parseInt(fnArgs[2], 10) : 1,
        successCounter: fnArgs[3] ? parseInt(fnArgs[3], 10) : 0,
        decrement: decrement ?? Weight.build(0, "lb"),
        failures: fnArgs[5] ? parseInt(fnArgs[5], 10) : 0,
        failureCounter: fnArgs[6] ? parseInt(fnArgs[6], 10) : 0,
      };
    } else if (property.fnName === "dp") {
      const increment = fnArgs[0] ? Weight.parse(fnArgs[0]) : Weight.build(0, "lb");
      return {
        increment: increment ?? Weight.build(0, "lb"),
        minReps: fnArgs[1] ? parseInt(fnArgs[1], 10) : 0,
        maxReps: fnArgs[2] ? parseInt(fnArgs[2], 10) : 0,
      };
    } else if (property.fnName === "sum") {
      const increment = fnArgs[1] ? Weight.parse(fnArgs[1]) : Weight.build(0, "lb");
      return {
        reps: fnArgs[0] ? parseInt(fnArgs[0], 10) : 0,
        increment: increment ?? Weight.build(0, "lb"),
      };
    } else {
      return {};
    }
  }

  public static getStateMetadata(exercise: IPlannerProgramExercise): IProgramStateMetadata {
    const customProgress = exercise.properties.find((p) => p.name === "progress" && p.fnName === "custom");
    const metadata: IProgramStateMetadata = {};
    if (!customProgress) {
      return {};
    }
    for (const value of customProgress.fnArgs) {
      const [fnArgKey] = value.split(":").map((v) => v.trim());
      if (fnArgKey.endsWith("+")) {
        metadata[fnArgKey.replace("+", "")] = { userPrompted: true };
      }
    }
    return metadata;
  }

  public static getStateMetadataFromProperty(progress: IPlannerProgramProperty): IProgramStateMetadata {
    const metadata: IProgramStateMetadata = {};
    if (progress.fnName !== "custom") {
      return {};
    }
    for (const value of progress.fnArgs) {
      const [fnArgKey] = value.split(":").map((v) => v.trim());
      if (fnArgKey.endsWith("+")) {
        metadata[fnArgKey.replace("+", "")] = { userPrompted: true };
      }
    }
    return metadata;
  }

  public static getProgress(exercise: IPlannerProgramExercise): IPlannerProgramProperty | undefined {
    return exercise.properties.find((p) => p.name === "progress");
  }

  public static getUpdate(exercise: IPlannerProgramExercise): IPlannerProgramProperty | undefined {
    return exercise.properties.find((p) => p.name === "update");
  }

  public static getProgressScript(exercise: IPlannerProgramExercise): string | undefined {
    const progress = this.getProgress(exercise);
    if (!progress) {
      return "";
    }
    return this.getProgressScriptFromProperty(progress);
  }

  public static getProgressScriptFromProperty(property: IPlannerProgramProperty): string | undefined {
    if (property.reuse) {
      return this.getProgressScriptFromProperty(property.reuse);
    }
    if (property.fnName === "custom") {
      return property.script;
    } else if (property.fnName === "lp") {
      return `if (completedReps >= reps && completedRPE <= RPE) {
  state.successCounter += 1;
  if (state.successCounter >= state.successes) {
    weights += state.increment
    state.successCounter = 0
    state.failureCounter = 0
  }
}
if (state.decrement > 0 && state.failureCounter > 0) {
  if (!(completedReps >= minReps && completedRPE <= RPE)) {
    state.failureCounter += 1;
    if (state.failureCounter >= state.failures) {
      weights -= state.decrement
      state.failureCounter = 0
      state.successCounter = 0
    }
  }
}`;
    } else if (property.fnName === "dp") {
      return `
if (completedReps >= reps && completedRPE <= RPE) {
  if (reps[ns] < state.maxReps) {
    reps += 1
  } else {
    reps = state.minReps
    weights += state.increment
  }
}`;
    } else if (property.fnName === "sum") {
      return `if (sum(completedReps) >= state.reps}) {
  weights += state.increment
}`;
    } else {
      return undefined;
    }
  }

  public static getUpdateScript(exercise: IPlannerProgramExercise): string | undefined {
    const update = this.getUpdate(exercise);
    if (update && update.fnName === "custom") {
      return update.script;
    } else {
      return undefined;
    }
  }

  public static getEnableRpe(exercise: IPlannerProgramExercise): boolean {
    return exercise.setVariations.some((sv, i) => this.sets(exercise, i).some((s) => s.rpe != null));
  }

  public static getEnableRepRanges(exercise: IPlannerProgramExercise): boolean {
    return exercise.setVariations.some((sv, i) =>
      this.sets(exercise, i).some((s) => s.repRange != null && s.repRange.minrep === s.repRange.maxrep)
    );
  }

  public static progressionType(exercise: IPlannerProgramExercise): IProgressionType | undefined {
    const progress = exercise.properties.find((p) => p.name === "progress");
    if (!progress) {
      return undefined;
    }
    const name = progress.fnName;
    const args = progress.fnArgs;
    if (name === "lp") {
      const increase = Weight.parsePct(args[0]);
      if (increase == null) {
        return undefined;
      }
      return {
        type: "linear",
        increase: increase,
        successesRequired: MathUtils.parse(args[2]),
        decrease: Weight.parsePct(args[3]),
        failuresRequired: MathUtils.parse(args[5]),
      };
    } else if (name === "dp") {
      const increase = Weight.parsePct(args[0]);
      if (increase == null) {
        return undefined;
      }
      return {
        type: "double",
        increase: increase,
        minReps: MathUtils.parse(args[1]) || 0,
        maxReps: MathUtils.parse(args[2]) || 0,
      };
    } else if (name === "sum") {
      const increase = Weight.parsePct(args[1]);
      if (increase == null) {
        return undefined;
      }
      return {
        type: "sumreps",
        increase: increase,
        reps: MathUtils.parse(args[0]) || 0,
      };
    } else if (name === "custom") {
      return { type: "custom" };
    }
    return undefined;
  }
}
