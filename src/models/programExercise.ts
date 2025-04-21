import { IProgramState, IProgramExerciseWarmupSet, ISettings, IProgramSet, IPercentage } from "../types";
import { IEvaluatedProgram, Program } from "./program";
import { ProgramSet } from "./programSet";
import { IWeight } from "../types";
import { ObjectUtils } from "../utils/object";
import { Weight } from "./weight";
import { Exercise } from "./exercise";
import { CollectionUtils } from "../utils/collection";
import { ScriptRunner } from "../parser";
import { IAssignmentOp, ILiftoscriptEvaluatorUpdate } from "../liftoscriptEvaluator";
import { MathUtils } from "../utils/math";
import {
  IPlannerProgramExercise,
  IPlannerProgramExerciseEvaluatedSet,
  IPlannerProgramExerciseUsed,
} from "../pages/planner/models/types";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import { PP } from "./pp";

export interface IWeightChange {
  originalWeight: IWeight | IPercentage;
  weight: IWeight | IPercentage;
  current: boolean;
}

export interface IProgramExerciseExample {
  title: string;
  description: string;
  sets: IProgramSet[];
  state: IProgramState;
  finishDayExpr: string;
  rules: {
    sets: "keep" | "replace";
    reps: "keep" | "keep_if_has_vars" | "replace";
    weight: "keep" | "keep_if_has_vars" | "replace";
  };
}

export namespace ProgramExercise {
  export function hasUserPromptedVars(programExercise: IPlannerProgramExercise): boolean {
    const stateMetadata = PlannerProgramExercise.getStateMetadata(programExercise) || {};
    return ObjectUtils.keys(stateMetadata).some((key) => stateMetadata[key]?.userPrompted);
  }

  export function getQuickAddSets(programExercise: IPlannerProgramExercise): boolean {
    return PlannerProgramExercise.sets(programExercise).some((set) => !!set.repRange?.isQuickAddSet);
  }

  export function getEnableRpe(programExercise: IPlannerProgramExercise): boolean {
    return PlannerProgramExercise.sets(programExercise).some((set) => set.rpe != null);
  }

  function warmupSetToKey(set: IProgramExerciseWarmupSet): string {
    return `${set.reps}-${Weight.print(set.threshold)}-${Weight.printOrNumber(set.value)}`;
  }

  export function groupWarmupsSets(sets: IProgramExerciseWarmupSet[]): [IProgramExerciseWarmupSet, number][] {
    let lastKey: string | undefined;
    const groups: [IProgramExerciseWarmupSet, number][] = [];
    for (const set of sets) {
      const key = warmupSetToKey(set);
      if (lastKey == null || lastKey !== key) {
        groups.push([set, 0]);
      }
      groups[groups.length - 1][1] += 1;
      lastKey = key;
    }
    return groups;
  }

  export function approxTimeMs(programExercise: IPlannerProgramExercise, settings: ISettings): number {
    return (
      PlannerProgramExercise.currentEvaluatedSetVariation(programExercise)?.sets.reduce(
        (memo, set) => memo + ProgramSet.approxTimeMs(set, settings),
        0
      ) || 0
    );
  }

  export function doesUse1RM(programExercise: IPlannerProgramExercise): boolean {
    const usesPercentageWeights = programExercise.evaluatedSetVariations.some((v) => {
      return v.sets.some((set) => {
        return Weight.isPct(set.weight);
      });
    });
    const usesRM1Var = ProgramExercise.isUsingVariable(programExercise, "rm1");
    return usesPercentageWeights || usesRM1Var;
  }

  export function isUsingVariable(programExercise: IPlannerProgramExercise, name: string): boolean {
    const expressions = CollectionUtils.compact([
      PlannerProgramExercise.getProgressScript(programExercise),
      PlannerProgramExercise.getUpdateScript(programExercise),
    ]);
    return expressions.some((e) => ScriptRunner.hasKeyword(e, name));
  }

  export function weightChanges(program: IEvaluatedProgram, programExerciseKey: string): IWeightChange[] {
    const results: Record<string, IWeightChange> = {};
    PP.iterate2(program.weeks, (exercise) => {
      if (exercise.key === programExerciseKey) {
        const currentVariationIndex = PlannerProgramExercise.currentEvaluatedSetVariationIndex(exercise);
        for (let variationIndex = 0; variationIndex < exercise.evaluatedSetVariations.length; variationIndex += 1) {
          const variation = exercise.evaluatedSetVariations[variationIndex];
          for (let setIndex = 0; setIndex < variation.sets.length; setIndex += 1) {
            const set = variation.sets[setIndex];
            if (set.weight) {
              const key = Weight.print(set.weight);
              results[key] = {
                originalWeight: set.weight,
                weight: set.weight,
                current: results[key]?.current || variationIndex + 1 === currentVariationIndex,
              };
            }
          }
        }
      }
    });
    return CollectionUtils.sortBy(ObjectUtils.values(results), "current", true);
  }

  export function applyVariables(
    programExerciseKey: string,
    program: IEvaluatedProgram,
    updates: ILiftoscriptEvaluatorUpdate[],
    settings: ISettings
  ): void {
    for (const update of updates) {
      const key = update.type;
      const value = update.value;
      const target = value.target;
      const [week, day, variation, set] = target;
      let dayIndex = 0;
      for (let weekIndex = 0; weekIndex < program.weeks.length; weekIndex += 1) {
        const programWeek = program.weeks[weekIndex];
        for (let dayInWeekIndex = 0; dayInWeekIndex < programWeek.days.length; dayInWeekIndex += 1) {
          const programDay = programWeek.days[dayInWeekIndex];
          const dayExercises = Program.getProgramDayExercises(programDay);
          const exercises = dayExercises.filter((e) => e.key === programExerciseKey);
          for (const exercise of exercises) {
            for (let variationIndex = 0; variationIndex < exercise.evaluatedSetVariations.length; variationIndex += 1) {
              const setVariation = exercise.evaluatedSetVariations[variationIndex];
              const sets = setVariation.sets;
              if (
                (week === "*" || week === weekIndex + 1) &&
                (day === "*" || day === dayInWeekIndex + 1) &&
                (variation === "*" || variation === variationIndex + 1)
              ) {
                if (key === "numberOfSets" && typeof value.value === "number") {
                  const newValue = MathUtils.applyOp(sets.length, value.value, value.op);
                  const defaultSet: IPlannerProgramExerciseEvaluatedSet = {
                    maxrep: 1,
                    weight: Weight.build(100, "lb"),
                    logRpe: false,
                    isAmrap: false,
                    isQuickAddSet: false,
                    askWeight: false,
                  };
                  const lastSet = sets[sets.length - 1] || defaultSet;
                  sets.splice(newValue);
                  for (let i = sets.length; i < newValue; i += 1) {
                    sets.push(ObjectUtils.clone(lastSet));
                  }
                }
              }
              for (let setIndex = 0; setIndex < sets.length; setIndex += 1) {
                if (
                  (week === "*" || week === weekIndex + 1) &&
                  (day === "*" || day === dayInWeekIndex + 1) &&
                  (variation === "*" || variation === variationIndex + 1) &&
                  (set === "*" || set === setIndex + 1)
                ) {
                  if (key === "RPE") {
                    operation(exercise, sets[setIndex], settings, "rpe", value.value, value.op);
                  } else if (key === "reps") {
                    operation(exercise, sets[setIndex], settings, "maxrep", value.value, value.op);
                  } else if (key === "minReps") {
                    operation(exercise, sets[setIndex], settings, "minrep", value.value, value.op);
                  } else if (key === "timers") {
                    operation(exercise, sets[setIndex], settings, "timer", value.value, value.op);
                  } else if (key === "weights") {
                    operation(exercise, sets[setIndex], settings, "weight", value.value, value.op);
                  }
                }
              }
            }
            if ((week === "*" || week === weekIndex + 1) && (day === "*" || day === dayInWeekIndex + 1)) {
              if (key === "setVariationIndex" && typeof update.value.value === "number") {
                let indexValue: number;
                if (update.value.op === "=") {
                  indexValue = update.value.value - 1;
                } else {
                  const currentSetVariationIndex = PlannerProgramExercise.currentEvaluatedSetVariationIndex(exercise);
                  indexValue = Weight.applyOp(
                    undefined,
                    currentSetVariationIndex,
                    update.value.value,
                    update.value.op
                  ) as number;
                }
                indexValue = indexValue % exercise.evaluatedSetVariations.length;
                exercise.evaluatedSetVariations.forEach((s) => (s.isCurrent = false));
                const sv = exercise.evaluatedSetVariations[indexValue];
                if (sv != null) {
                  sv.isCurrent = true;
                }
              } else if (key === "descriptionIndex" && typeof update.value.value === "number") {
                let indexValue: number;
                if (update.value.op === "=") {
                  indexValue = update.value.value - 1;
                } else {
                  const currentDescriptionIndex = PlannerProgramExercise.currentDescriptionIndex(exercise);
                  indexValue = Weight.applyOp(
                    undefined,
                    currentDescriptionIndex,
                    update.value.value,
                    update.value.op
                  ) as number;
                }
                indexValue = indexValue % exercise.descriptions.values.length;
                exercise.descriptions.values.forEach((s) => (s.isCurrent = false));
                const d = exercise.descriptions.values[indexValue];
                if (d != null) {
                  d.isCurrent = true;
                }
              }
            }
          }
          dayIndex += 1;
        }
      }
    }
  }

  function operation(
    programExercise: IPlannerProgramExerciseUsed,
    set: IPlannerProgramExerciseEvaluatedSet,
    settings: ISettings,
    key: "maxrep" | "minrep" | "weight" | "rpe" | "timer",
    value: IWeight | IPercentage | number,
    op: IAssignmentOp
  ): void {
    if (op === "=") {
      if (key === "weight" && (Weight.is(value) || Weight.isPct(value))) {
        set[key] = value;
      } else if (
        typeof value === "number" &&
        (key === "maxrep" || key === "minrep" || key === "timer" || key === "rpe")
      ) {
        set[key] = value;
      }
    } else {
      const onerm = Exercise.onerm(programExercise.exerciseType, settings);
      const oldValue = set[key];
      const newValue = Weight.applyOp(onerm, oldValue ?? 0, value, op);
      if (key === "weight" && (Weight.is(newValue) || Weight.isPct(newValue))) {
        set[key] = newValue;
      } else if (
        typeof newValue === "number" &&
        (key === "maxrep" || key === "minrep" || key === "timer" || key === "rpe")
      ) {
        set[key] = newValue;
      }
    }
  }
}
