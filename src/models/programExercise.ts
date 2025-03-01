import {
  IProgramExercise,
  IProgramState,
  IProgramExerciseVariation,
  IProgramExerciseWarmupSet,
  ISettings,
  IProgramSet,
  IUnit,
  IProgramExerciseReuseLogic,
  IPercentage,
} from "../types";
import { IEvaluatedProgram } from "./program";
import { ProgramSet } from "./programSet";
import { IProgramStateMetadata, IWeight } from "../types";
import { ObjectUtils } from "../utils/object";
import { Weight } from "./weight";
import { Exercise } from "./exercise";
import { CollectionUtils } from "../utils/collection";
import { ScriptRunner } from "../parser";
import { IAssignmentOp, ILiftoscriptEvaluatorUpdate } from "../liftoscriptEvaluator";
import { MathUtils } from "../utils/math";
import { IPlannerProgramExercise, IPlannerProgramExerciseEvaluatedSet } from "../pages/planner/models/types";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";

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
  export function getState(programExercise: IProgramExercise, allProgramExercises: IProgramExercise[]): IProgramState {
    const reuseLogicId = programExercise.reuseLogic?.selected;
    if (reuseLogicId != null) {
      const reusedProgramExercise = allProgramExercises.filter((pe) => pe.id === reuseLogicId)[0];
      if (reusedProgramExercise != null) {
        return mergeStates(programExercise.reuseLogic?.states[reuseLogicId] || {}, reusedProgramExercise.state);
      }
    }

    return programExercise.state;
  }

  export function hasUserPromptedVars(programExercise: IPlannerProgramExercise): boolean {
    const stateMetadata = PlannerProgramExercise.getStateMetadata(programExercise) || {};
    return ObjectUtils.keys(stateMetadata).some((key) => stateMetadata[key]?.userPrompted);
  }

  export function mergeStates(aState: IProgramState, bState: IProgramState): IProgramState {
    const newState: IProgramState = {};
    for (const key of Object.keys(bState)) {
      newState[key] = aState[key] ?? bState[key];
    }
    return newState;
  }

  export function getFinishDayScript(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[]
  ): string {
    if (programExercise.reuseFinishDayScript) {
      return allProgramExercises.find((pe) => pe.id === programExercise.reuseFinishDayScript)?.finishDayExpr || "";
    } else {
      return getProgramExercise(programExercise, allProgramExercises).finishDayExpr;
    }
  }

  export function getUpdateDayScript(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[]
  ): string | undefined {
    if (programExercise.reuseUpdateDayScript) {
      return allProgramExercises.find((pe) => pe.id === programExercise.reuseUpdateDayScript)?.updateDayExpr;
    } else {
      return getProgramExercise(programExercise, allProgramExercises).updateDayExpr;
    }
  }

  export function getVariationScript(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[]
  ): string {
    return getProgramExercise(programExercise, allProgramExercises).variationExpr;
  }

  export function getStateMetadata(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[]
  ): IProgramStateMetadata | undefined {
    return getProgramExercise(programExercise, allProgramExercises).stateMetadata;
  }

  export function getVariations(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[]
  ): IProgramExerciseVariation[] {
    return getProgramExercise(programExercise, allProgramExercises).variations;
  }

  export function getTimerExpr(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[]
  ): string | undefined {
    return getProgramExercise(programExercise, allProgramExercises).timerExpr;
  }

  export function getQuickAddSets(programExercise: IPlannerProgramExercise): boolean {
    return PlannerProgramExercise.sets(programExercise).some((set) => !!set.repRange?.isQuickAddSet);
  }

  export function getEnableRpe(programExercise: IPlannerProgramExercise): boolean {
    return PlannerProgramExercise.sets(programExercise).some((set) => set.rpe != null);
  }

  export function getEnableRepRanges(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[]
  ): boolean {
    return !!getProgramExercise(programExercise, allProgramExercises).enableRepRanges;
  }

  export function getReusedProgramExercise<T>(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[]
  ): IProgramExercise | undefined {
    const reuseLogicId = programExercise.reuseLogic?.selected;
    if (reuseLogicId != null) {
      const reusedProgramExercise = allProgramExercises.filter((pe) => pe.id === reuseLogicId)[0];
      if (reusedProgramExercise != null) {
        return reusedProgramExercise;
      }
    }

    return undefined;
  }

  export function isDescriptionReused(programExercise: IProgramExercise): boolean {
    return !!(programExercise.reuseLogic?.selected && !programExercise.descriptions.some((d) => !!d));
  }

  export function resolveProgramExercise(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[]
  ): IProgramExercise {
    const resolvedExercise = ProgramExercise.getProgramExercise(programExercise, allProgramExercises);
    return {
      ...programExercise,
      reuseLogic: undefined,
      variations: resolvedExercise.variations,
      state: resolvedExercise.state,
      variationExpr: resolvedExercise.variationExpr,
      finishDayExpr: resolvedExercise.finishDayExpr,
      stateMetadata: resolvedExercise.stateMetadata,
      timerExpr: resolvedExercise.timerExpr,
      warmupSets: resolvedExercise.warmupSets,
    };
  }

  export function getProgramExercise(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[]
  ): IProgramExercise {
    return getReusedProgramExercise(programExercise, allProgramExercises) || programExercise;
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
    const index = PlannerProgramExercise.currentSetVariationIndex(programExercise);
    return programExercise.evaluatedSetVariations[index].sets.reduce(
      (memo, set) => memo + ProgramSet.approxTimeMs(set, settings),
      0
    );
  }

  export function getStateVariableType(value: number | IWeight | IPercentage): "number" | "kg" | "lb" | "%" {
    if (typeof value === "number") {
      return "number";
    } else {
      return value.unit;
    }
  }

  export function hasDifferentUnitStateVariables(programExercise: IProgramExercise, unit: IUnit): boolean {
    const reuseLogicId = programExercise.reuseLogic?.selected;
    const state = reuseLogicId ? programExercise.reuseLogic?.states[reuseLogicId]! : programExercise.state;
    return Object.keys(state).some((key) => {
      const value = state[key];
      return Weight.is(value) && value.unit !== unit;
    });
  }

  export function hasDifferentWarmupUnits(programExercise: IProgramExercise, unit: IUnit): boolean {
    return (programExercise.warmupSets || []).some((warmupSet) => {
      return (
        (Weight.is(warmupSet.value) && warmupSet.value.unit !== unit) ||
        (Weight.is(warmupSet.threshold) && warmupSet.threshold.unit !== unit)
      );
    });
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

  export function switchToUnit(programExercise: IProgramExercise, settings: ISettings): IProgramExercise {
    const unit = settings.units;
    const newState = { ...programExercise.state };
    for (const key of Object.keys(newState)) {
      const value = newState[key];
      if (Weight.is(value) && value.unit !== unit) {
        newState[key] = Weight.roundConvertTo(value, settings, unit);
      }
    }

    const reuseLogic = programExercise.reuseLogic;
    let newReuseLogic: IProgramExerciseReuseLogic | undefined = reuseLogic;
    if (reuseLogic != null) {
      newReuseLogic = {
        ...reuseLogic,
        states: Object.keys(reuseLogic.states).reduce<Record<string, IProgramState>>((memo, k) => {
          const newReuseState = { ...reuseLogic.states[k] };
          for (const key of Object.keys(newReuseState)) {
            const value = newReuseState[key];
            if (Weight.is(value)) {
              newReuseState[key] = Weight.roundConvertTo(value, settings, unit);
            }
          }
          memo[k] = newReuseState;
          return memo;
        }, {}),
      };
    }

    const newWarmupSets = (programExercise.warmupSets || []).map((w) => ({
      ...w,
      value: Weight.is(w.value) ? Weight.roundConvertTo(w.value, settings, unit) : w.value,
      threshold: Weight.is(w.threshold) ? Weight.roundConvertTo(w.threshold, settings, unit) : w.threshold,
    }));

    return {
      ...programExercise,
      state: newState,
      reuseLogic: newReuseLogic,
      warmupSets: newWarmupSets,
    };
  }

  export function isUsingVariable(programExercise: IPlannerProgramExercise, name: string): boolean {
    const expressions = CollectionUtils.compact([
      PlannerProgramExercise.getProgressScript(programExercise),
      PlannerProgramExercise.getUpdateScript(programExercise),
    ]);
    return expressions.some((e) => ScriptRunner.hasKeyword(e, name));
  }

  export function mergeExercises(
    oldExercise: IProgramExercise,
    newExercise: IProgramExercise,
    enforceNew: boolean = false
  ): IProgramExercise {
    function v1<K1 extends keyof IProgramExercise>(key: K1): IProgramExercise[K1] {
      return enforceNew || (newExercise.diffPaths || []).some((dp) => dp.startsWith(key))
        ? newExercise[key] ?? oldExercise[key]
        : oldExercise[key] ?? newExercise[key];
    }

    function v4<
      K1 extends keyof IProgramExercise,
      K2 extends keyof IProgramExercise[K1],
      K3 extends keyof IProgramExercise[K1][K2],
      K4 extends keyof IProgramExercise[K1][K2][K3]
    >(key1: K1, key2: K2, key3: K3, key4: K4): IProgramExercise[K1][K2][K3][K4] {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const diffPath = `${key1}.${key2 as any}.${key3 as any}.${key4 as any}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oldValue = ((oldExercise[key1] as any)?.[key2] as any)?.[key3]?.[key4];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newValue = (newExercise[key1] as any)[key2]?.[key3][key4];
      return enforceNew || (newExercise.diffPaths || []).some((dp) => dp.startsWith(diffPath))
        ? newValue ?? oldValue ?? newValue
        : oldValue ?? newValue;
    }

    return {
      ...oldExercise,
      ...newExercise,
      state: { ...oldExercise.state, ...newExercise.state },
      reuseLogic: {
        selected: newExercise.reuseLogic?.selected,
        states: ObjectUtils.keys(newExercise.reuseLogic?.states || {}).reduce<Record<string, IProgramState>>(
          (memo, key) => {
            memo[key] = { ...oldExercise.reuseLogic?.states[key], ...newExercise.reuseLogic?.states[key] };
            return memo;
          },
          {}
        ),
      },
      exerciseType: v1("exerciseType"),
      id: v1("id"),
      name: v1("name"),
      variations: newExercise.variations.map((variation, i) => {
        return {
          sets: variation.sets.map((_, j) => {
            return v4("variations", i, "sets", j);
          }),
        };
      }),
      variationExpr: v1("variationExpr"),
      finishDayExpr: v1("finishDayExpr"),
      descriptions: v1("descriptions"),
      description: v1("description"),
      descriptionExpr: v1("descriptionExpr"),
      quickAddSets: v1("quickAddSets"),
      enableRepRanges: v1("enableRepRanges"),
      enableRpe: v1("enableRpe"),
      stateMetadata:
        enforceNew || (newExercise.diffPaths || []).some((dp) => dp.startsWith("stateMetadata"))
          ? { ...oldExercise.stateMetadata, ...newExercise.stateMetadata }
          : { ...newExercise.stateMetadata, ...oldExercise.stateMetadata },
      timerExpr: v1("timerExpr"),
      warmupSets: v1("warmupSets"),
      diffPaths: enforceNew ? oldExercise.diffPaths : [],
    };
  }

  export function areVariationsEqual(old: IProgramExercise, now: IProgramExercise): boolean {
    if (old.variations.length !== now.variations.length) {
      return false;
    }
    return old.variations.every((v, i) => {
      const newVariation = now.variations[i];
      if (newVariation.sets.length !== v.sets.length) {
        return false;
      }
      return v.sets.every((s, j) => {
        const newSet = newVariation.sets[j];
        return ProgramSet.isEqual(s, newSet);
      });
    });
  }

  export function weightChanges(programExercise: IPlannerProgramExercise): IWeightChange[] {
    const results: Record<string, IWeightChange> = {};
    const currentVariationIndex = PlannerProgramExercise.currentSetVariationIndex(programExercise);
    for (let variationIndex = 0; variationIndex < programExercise.evaluatedSetVariations.length; variationIndex += 1) {
      const variation = programExercise.evaluatedSetVariations[variationIndex];
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
          const exercises = programDay.exercises.filter((e) => e.key === programExerciseKey);
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
                exercise.evaluatedSetVariations.forEach((s) => (s.isCurrent = false));
                const sv = exercise.evaluatedSetVariations[update.value.value];
                if (sv != null) {
                  sv.isCurrent = true;
                }
              } else if (key === "descriptionIndex" && typeof update.value.value === "number") {
                exercise.descriptions.forEach((s) => (s.isCurrent = false));
                const d = exercise.descriptions[update.value.value];
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
    programExercise: IPlannerProgramExercise,
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
      if (oldValue != null) {
        const newValue = Weight.applyOp(onerm, oldValue, value, op);
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
}
