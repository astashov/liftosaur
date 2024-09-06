import {
  IPlannerProgramExercise,
  IPlannerProgramExerciseGlobals,
  IPlannerProgramExerciseSet,
  IPlannerProgramExerciseSetVariation,
  IPlannerProgramExerciseWarmupSet,
} from "./types";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { ObjectUtils } from "../../../utils/object";
import { IDisplaySet, groupDisplaySets } from "../../../components/historyRecordSets";
import { Weight } from "../../../models/weight";
import { ISettings } from "../../../types";
import { Exercise, IExercise, warmupValues } from "../../../models/exercise";
import { ProgramExercise } from "../../../models/programExercise";

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
    const setVariations = exercise.setVariations;
    return setVariations.length === 0
      ? [{ sets: PlannerProgramExercise.sets(exercise), isCurrent: true }]
      : setVariations;
  }

  public static warmups(exercise: IPlannerProgramExercise): IPlannerProgramExerciseWarmupSet[] | undefined {
    return exercise.warmupSets || exercise.reuse?.exercise?.warmupSets;
  }

  public static sets(exercise: IPlannerProgramExercise, variationIndex?: number): IPlannerProgramExerciseSet[] {
    const reusedSets = exercise.reuse?.exercise?.sets;
    const reusedGlobals = exercise.reuse?.exercise?.globals || {};
    variationIndex = variationIndex ?? this.currentSetVariation(exercise);
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

  public static currentSetVariation(exercise: IPlannerProgramExercise): number {
    const index = exercise.setVariations.findIndex((sv) => sv.isCurrent);
    return index === -1 ? 0 : index;
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
}
