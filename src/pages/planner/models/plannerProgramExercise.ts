import {
  IPlannerProgramExercise,
  IPlannerProgramExerciseEvaluatedSet,
  IPlannerProgramExerciseEvaluatedSetVariation,
  IPlannerProgramExerciseGlobals,
  IPlannerProgramExerciseSet,
  IPlannerProgramExerciseSetVariation,
  IPlannerProgramExerciseUsed,
  IPlannerProgramExerciseWarmupSet,
} from "./types";
import { IPlannerEvalResult, PlannerExerciseEvaluator } from "../plannerExerciseEvaluator";
import { ObjectUtils } from "../../../utils/object";
import { IDisplaySet, groupDisplaySets } from "../../../components/historyRecordSets";
import { Weight } from "../../../models/weight";
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
import { equipmentName, Exercise, IExercise, warmupValues } from "../../../models/exercise";
import { ProgramExercise } from "../../../models/programExercise";
import { MathUtils } from "../../../utils/math";
import { UidFactory } from "../../../utils/generator";
import { PlannerKey } from "../plannerKey";
import { CollectionUtils } from "../../../utils/collection";

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
    const setVariations = (originalSetVariations?.length > 0 ? originalSetVariations : reuseSetVariations) || [];
    return setVariations.length === 0
      ? [{ sets: PlannerProgramExercise.sets(exercise), isCurrent: true }]
      : setVariations;
  }

  public static warmups(exercise: IPlannerProgramExercise): IPlannerProgramExerciseWarmupSet[] | undefined {
    return exercise.warmupSets || exercise.reuse?.exercise?.warmupSets;
  }

  public static programWarmups(
    exercise: IPlannerProgramExercise,
    settings: ISettings
  ): IProgramExerciseWarmupSet[] | undefined {
    const exerciseWarmups = PlannerProgramExercise.warmups(exercise);
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

  public static toUsed(exercise?: IPlannerProgramExercise): IPlannerProgramExerciseUsed | undefined {
    if (exercise?.exerciseType != null) {
      return exercise as IPlannerProgramExerciseUsed;
    } else {
      return undefined;
    }
  }

  public static evaluateSetVariations(
    exercise: IPlannerProgramExercise,
    setVariations: IPlannerProgramExerciseSetVariation[]
  ): IPlannerProgramExerciseEvaluatedSetVariation[] {
    const evaluatedSetVariations: IPlannerProgramExerciseEvaluatedSetVariation[] = [];
    for (let i = 0; i < setVariations.length; i++) {
      const sets = PlannerProgramExercise.sets(exercise, i);
      const evaluatedSets: IPlannerProgramExerciseEvaluatedSet[] = [];
      for (const aSet of sets) {
        if (aSet.repRange == null) {
          continue;
        }
        for (let j = 0; j < aSet.repRange.numberOfSets; j++) {
          evaluatedSets.push({
            maxrep: aSet.repRange.maxrep,
            minrep: aSet.repRange.minrep,
            weight: aSet.weight ? aSet.weight : aSet.percentage ? Weight.buildPct(aSet.percentage) : undefined,
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

  public static currentSetVariationIndex(exercise: IPlannerProgramExercise): number {
    const index = exercise.setVariations.findIndex((sv) => sv.isCurrent);
    return index === -1 ? 0 : index;
  }

  public static currentEvaluatedSetVariationIndex(exercise: IPlannerProgramExercise): number {
    const index = exercise.evaluatedSetVariations.findIndex((sv) => sv.isCurrent);
    return index === -1 ? 0 : index;
  }

  public static currentEvaluatedSetVariation(
    exercise: IPlannerProgramExercise
  ): IPlannerProgramExerciseEvaluatedSetVariation {
    const index = this.currentEvaluatedSetVariationIndex(exercise);
    return exercise.evaluatedSetVariations[index];
  }

  public static currentDescription(exercise: IPlannerProgramExercise): string | undefined {
    const index = this.currentDescriptionIndex(exercise);
    return exercise.descriptions.values[index]?.value;
  }

  public static currentDescriptionIndex(exercise: IPlannerProgramExercise): number {
    const index = exercise.descriptions.values.findIndex((d) => d.isCurrent);
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

  public static getProgressScript(exercise: IPlannerProgramExercise): string | undefined {
    return (
      exercise.progress?.script ??
      exercise.progress?.reuse?.exercise?.progress?.script ??
      exercise.reuse?.exercise?.progress?.script
    );
  }

  public static getState(exercise: IPlannerProgramExercise): IProgramState {
    const originalState = exercise.progress?.reuse?.exercise
      ? this.getState(exercise.progress.reuse.exercise)
      : exercise.reuse?.exercise
        ? this.getState(exercise.reuse.exercise)
        : {};

    return { ...originalState, ...exercise.progress?.state };
  }

  public static getOnlyChangedState(exercise: IPlannerProgramExercise): IProgramState {
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
    return ObjectUtils.filter(
      state,
      (key, value) =>
        originalState[key] == null ||
        !Weight.eq(originalState[key], value) ||
        originalStateMetadata[key]?.userPrompted != stateMetadata[key]?.userPrompted
    ) as IProgramState;
  }

  public static getStateMetadata(exercise: IPlannerProgramExercise): IProgramStateMetadata {
    const originalState = exercise.progress?.reuse?.exercise
      ? this.getStateMetadata(exercise.progress.reuse.exercise)
      : exercise.reuse?.exercise
        ? this.getStateMetadata(exercise.reuse.exercise)
        : {};

    return { ...originalState, ...exercise.progress?.stateMetadata };
  }

  public static getUpdateScript(exercise: IPlannerProgramExercise): string | undefined {
    return (
      exercise.update?.script ??
      exercise.update?.reuse?.exercise?.update?.script ??
      exercise.reuse?.exercise?.update?.script
    );
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
    const progress = exercise.progress;
    if (!progress) {
      return undefined;
    }
    const name = progress.type;
    const state = PlannerProgramExercise.getState(exercise);
    if (name === "lp") {
      return {
        type: "linear",
        increase: state.increment as IWeight,
        successesRequired: state.successes as number,
        decrease: state.decrement as IWeight,
        failuresRequired: state.failures as number,
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

  public static shortNameFromFullName(fullName: string, settings: ISettings): string {
    let { name, equipment } = PlannerExerciseEvaluator.extractNameParts(fullName, settings);
    const shortName = `${name}${equipment ? `, ${equipmentName(equipment)}` : ""}`;
    return shortName;
  }

  public static createExerciseFromEntry(
    entry: IHistoryEntry,
    dayData: Required<IDayData>,
    settings: ISettings
  ): IPlannerProgramExercise {
    const exerciseType = entry.exercise;
    const exercise = Exercise.get(exerciseType, settings.exercises);
    const fullName = Exercise.fullName(exercise, settings);
    const shortName = this.shortNameFromFullName(fullName, settings);
    let { name, equipment } = PlannerExerciseEvaluator.extractNameParts(fullName, settings);
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
          percentage: Weight.isPct(set.originalWeight) ? set.originalWeight.value : undefined,
          weight: !Weight.isPct(set.originalWeight) ? (set.completedWeight ?? set.weight) : undefined,
          askWeight: set.askWeight,
        })),
      },
    ];
    const groupedWarmupSets = CollectionUtils.compact(
      ObjectUtils.values(
        CollectionUtils.groupByExpr(entry.warmupSets, (set) => {
          return `${set.completedReps ?? set.reps}-${(set.completedWeight ?? set.weight ?? { value: "" }).value}`;
        })
      )
    );
    const plannerExercise: IPlannerProgramExercise = {
      id: UidFactory.generateUid(8),
      key: PlannerKey.fromExerciseType(exercise, settings),
      fullName,
      shortName,
      dayData,
      exerciseType,
      repeat: [],
      repeating: [],
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
    const evaluatedSetVariations = this.evaluateSetVariations(plannerExercise, setVariations);
    plannerExercise.evaluatedSetVariations = evaluatedSetVariations;
    return plannerExercise;
  }
}
