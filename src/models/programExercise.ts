import {
  IProgramExercise,
  IProgramState,
  IProgramExerciseVariation,
  IProgramExerciseWarmupSet,
  ISettings,
  IHistoryRecord,
  IHistoryEntry,
  IProgramSet,
  IUnit,
  IProgramExerciseReuseLogic,
  IDayData,
  IProgram,
  IPercentage,
} from "../types";
import { Program } from "./program";
import { History } from "./history";
import { ProgramSet } from "./programSet";
import { IProgramStateMetadata, IWeight, IPlannerProgram } from "../types";
import { ObjectUtils } from "../utils/object";
import { Weight } from "./weight";
import { Exercise } from "./exercise";
import { CollectionUtils } from "../utils/collection";
import { ScriptRunner } from "../parser";
import { IAssignmentOp, ILiftoscriptEvaluatorUpdate, ILiftoscriptVariableValue } from "../liftoscriptEvaluator";
import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import { ProgramToPlanner } from "./programToPlanner";
import { Progress } from "./progress";
import { PlannerKey } from "../pages/planner/plannerKey";

export interface IWeightChange {
  originalWeight: IWeight | IPercentage;
  weight: IWeight | IPercentage;
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

  export function getStateForEntry(program: IProgram, entry: IHistoryEntry): IProgramState | undefined {
    const programExercise = program.exercises.filter((pe) => pe.id === entry.programExerciseId)[0];
    const allProgramExercises = program.exercises;
    return getState(programExercise, allProgramExercises);
  }

  export function hasUserPromptedVars(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[]
  ): boolean {
    const stateMetadata = getStateMetadata(programExercise, allProgramExercises) || {};
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

  export function getDescription(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[],
    dayData: IDayData,
    settings: ISettings,
    staticState?: IProgramState
  ): string {
    let reusedProgramExercise: IProgramExercise;
    if (isDescriptionReused(programExercise)) {
      reusedProgramExercise = getProgramExercise(programExercise, allProgramExercises);
    } else {
      reusedProgramExercise = programExercise;
    }
    const state = { ...getState(programExercise, allProgramExercises), ...staticState };
    if (reusedProgramExercise.descriptions.length < 2) {
      return reusedProgramExercise.descriptions[0] || "";
    } else {
      const script = reusedProgramExercise.descriptionExpr || "1";
      const resultIndex = Program.runDescriptionScript(script, programExercise.exerciseType, state, dayData, settings);
      if (resultIndex.success) {
        return reusedProgramExercise.descriptions[resultIndex.data - 1] || "";
      } else {
        return "";
      }
    }
  }

  export function getTimerExpr(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[]
  ): string | undefined {
    return getProgramExercise(programExercise, allProgramExercises).timerExpr;
  }

  export function getQuickAddSets(programExercise: IProgramExercise, allProgramExercises: IProgramExercise[]): boolean {
    return !!getProgramExercise(programExercise, allProgramExercises).quickAddSets;
  }

  export function getEnableRpe(programExercise: IProgramExercise, allProgramExercises: IProgramExercise[]): boolean {
    return !!getProgramExercise(programExercise, allProgramExercises).enableRpe;
  }

  export function getEnableRepRanges(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[]
  ): boolean {
    return !!getProgramExercise(programExercise, allProgramExercises).enableRepRanges;
  }

  export function getWarmupSets(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[]
  ): IProgramExerciseWarmupSet[] | undefined {
    return programExercise.warmupSets;
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

  export function approxTimeMs(
    dayData: IDayData,
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[],
    settings: ISettings
  ): number {
    const programExerciseVariations = getVariations(programExercise, allProgramExercises);
    const state = getState(programExercise, allProgramExercises);
    const nextVariationIndex = Program.nextVariationIndex(
      programExercise,
      allProgramExercises,
      state,
      dayData,
      settings
    );
    const variation = programExerciseVariations[nextVariationIndex];
    return variation.sets.reduce(
      (memo, set) => memo + ProgramSet.approxTimeMs(set, dayData, programExercise, allProgramExercises, settings),
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

  export function buildProgress(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[],
    dayData: IDayData,
    settings: ISettings
  ): IHistoryRecord | undefined {
    let entry: IHistoryEntry | undefined;
    let variationIndex = 0;
    const state = ProgramExercise.getState(programExercise, allProgramExercises);
    try {
      variationIndex = Program.nextVariationIndex(programExercise, allProgramExercises, state, dayData, settings);
    } catch (_) {}
    try {
      entry = Program.nextHistoryEntry(
        programExercise,
        allProgramExercises,
        dayData,
        ProgramExercise.getVariations(programExercise, allProgramExercises)[variationIndex].sets,
        state,
        settings,
        !!programExercise.enableRpe,
        ProgramExercise.getEnableRepRanges(programExercise, allProgramExercises),
        ProgramExercise.getWarmupSets(programExercise, allProgramExercises)
      );
    } catch (e) {
      entry = undefined;
    }
    return entry != null ? History.buildFromEntry(entry, dayData) : undefined;
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

  export function switchToUnit(programExercise: IProgramExercise, settings: ISettings): IProgramExercise {
    const unit = settings.units;
    const newState = { ...programExercise.state };
    for (const key of Object.keys(newState)) {
      const value = newState[key];
      if (Weight.is(value) && value.unit !== unit) {
        newState[key] = Weight.roundConvertTo(value, settings);
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
              newReuseState[key] = Weight.roundConvertTo(value, settings);
            }
          }
          memo[k] = newReuseState;
          return memo;
        }, {}),
      };
    }

    const newWarmupSets = (programExercise.warmupSets || []).map((w) => ({
      ...w,
      value: Weight.is(w.value) ? Weight.roundConvertTo(w.value, settings) : w.value,
      threshold: Weight.is(w.threshold) ? Weight.roundConvertTo(w.threshold, settings) : w.threshold,
    }));

    return {
      ...programExercise,
      state: newState,
      reuseLogic: newReuseLogic,
      warmupSets: newWarmupSets,
    };
  }

  export function isUsingVariable(programExercise: IProgramExercise, name: string): boolean {
    const expressions = CollectionUtils.compact(
      [
        programExercise.timerExpr,
        programExercise.descriptionExpr,
        programExercise.finishDayExpr,
        programExercise.variationExpr,
        programExercise.variations.map((v) => {
          return v.sets.map((s) => [s.repsExpr, s.rpeExpr, s.weightExpr, s.minRepsExpr]);
        }),
      ].flat(4)
    );
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
      const diffPath = `${key1}.${key2}.${key3}.${key4}`;
      const oldValue = oldExercise[key1]?.[key2]?.[key3]?.[key4];
      const newValue = newExercise[key1][key2][key3][key4];
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

  export function weightChanges(programExercise: IProgramExercise): IWeightChange[] {
    const results: Record<string, IWeightChange> = {};

    for (let variationIndex = 0; variationIndex < programExercise.variations.length; variationIndex += 1) {
      const variation = programExercise.variations[variationIndex];
      for (let setIndex = 0; setIndex < variation.sets.length; setIndex += 1) {
        const set = variation.sets[setIndex];
        if (set.weightExpr) {
          const weight = Weight.parsePct(set.weightExpr);
          if (weight != null) {
            results[set.weightExpr] = { originalWeight: weight, weight };
          }
        }
      }
    }
    return ObjectUtils.values(results);
  }

  export function applyVariables(
    dayData: IDayData,
    programExercise: IProgramExercise,
    plannerProgram: IPlannerProgram,
    updates: ILiftoscriptEvaluatorUpdate[],
    settings: ISettings,
    setVariationIndexMap: Record<string, ILiftoscriptVariableValue<number>[]>,
    descriptionIndexMap: Record<string, ILiftoscriptVariableValue<number>[]>
  ): IProgramExercise {
    const evaluatedWeeks = PlannerProgram.evaluate(plannerProgram, settings).evaluatedWeeks.map((w) =>
      CollectionUtils.compact(
        w.map((d) => {
          if (d.success) {
            return d.data.filter(
              (e) =>
                PlannerKey.fromPlannerExercise(e, settings) ===
                PlannerKey.fromProgramExercise(programExercise, settings)
            );
          } else {
            return undefined;
          }
        })
      )
    );
    const exerciseKey = PlannerKey.fromProgramExercise(programExercise, settings);
    const allVariationsMap = ProgramToPlanner.variationsMap(plannerProgram, settings);
    const variationsMap = allVariationsMap[exerciseKey];

    for (const update of updates) {
      const key = update.type;
      const value = update.value;
      const target = value.target;
      const [week, day, variation, set] = target;
      let dayIndex = 0;
      for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex += 1) {
        for (let dayInWeekIndex = 0; dayInWeekIndex < evaluatedWeeks[weekIndex].length; dayInWeekIndex += 1) {
          if (variationsMap[dayIndex]) {
            const [from, to] = variationsMap[dayIndex];
            const variations = programExercise.variations.slice(from, to);
            for (let variationIndex = 0; variationIndex < variations.length; variationIndex += 1) {
              const sets = variations[variationIndex].sets;
              for (let setIndex = 0; setIndex < sets.length; setIndex += 1) {
                if (
                  (week === "*" || week === weekIndex + 1) &&
                  (day === "*" || day === dayInWeekIndex + 1) &&
                  (variation === "*" || variation === variationIndex + 1) &&
                  (set === "*" || set === setIndex + 1)
                ) {
                  if (key === "RPE") {
                    operation(programExercise, sets[setIndex], dayData, settings, "rpeExpr", value.value, value.op);
                  } else if (key === "reps") {
                    operation(programExercise, sets[setIndex], dayData, settings, "repsExpr", value.value, value.op);
                  } else if (key === "minReps") {
                    operation(programExercise, sets[setIndex], dayData, settings, "minRepsExpr", value.value, value.op);
                  } else if (key === "timer") {
                    operation(programExercise, sets[setIndex], dayData, settings, "timerExpr", value.value, value.op);
                  } else if (key === "weights") {
                    operation(programExercise, sets[setIndex], dayData, settings, "weightExpr", value.value, value.op);
                  }
                }
              }
            }
            if ((week === "*" || week === weekIndex + 1) && (day === "*" || day === dayInWeekIndex + 1)) {
              if (key === "setVariationIndex" && typeof update.value.value === "number") {
                setVariationIndexMap[exerciseKey] = setVariationIndexMap[exerciseKey] || [];
                setVariationIndexMap[exerciseKey].push(update.value as ILiftoscriptVariableValue<number>);
              } else if (key === "descriptionIndex" && typeof update.value.value === "number") {
                descriptionIndexMap[exerciseKey] = descriptionIndexMap[exerciseKey] || [];
                descriptionIndexMap[exerciseKey].push(update.value as ILiftoscriptVariableValue<number>);
              }
            }
          }
          dayIndex += 1;
        }
      }
    }

    return programExercise;
  }

  function runScript(
    script: string,
    programExercise: IProgramExercise,
    dayData: IDayData,
    settings: ISettings
  ): ScriptRunner {
    return new ScriptRunner(
      script,
      programExercise.state,
      Progress.createEmptyScriptBindings(dayData, settings, programExercise.exerciseType),
      Progress.createScriptFunctions(settings),
      settings.units,
      { equipment: programExercise.exerciseType.equipment, unit: settings.units },
      "planner"
    );
  }

  function safe<T>(defaultValue: T, cb: () => T): T {
    return ScriptRunner.safe(cb, (e) => `There's an error while executing the script.`, defaultValue, false);
  }

  function operation(
    programExercise: IProgramExercise,
    set: IProgramSet,
    dayData: IDayData,
    settings: ISettings,
    key: "repsExpr" | "weightExpr" | "rpeExpr" | "minRepsExpr" | "timerExpr",
    value: IWeight | IPercentage | number,
    op: IAssignmentOp
  ): void {
    if (op === "=") {
      set[key] = Weight.printOrNumber(value);
    } else {
      const script = set[key] ?? "";
      const onerm = Exercise.onerm(programExercise.exerciseType, settings);
      const oldValue =
        key === "repsExpr"
          ? safe(0, () => runScript(script, programExercise, dayData, settings).execute("reps"))
          : key === "minRepsExpr"
          ? safe(0, () => runScript(script, programExercise, dayData, settings).execute("reps"))
          : key === "timerExpr"
          ? safe(0, () => runScript(script, programExercise, dayData, settings).execute("timer"))
          : key === "rpeExpr"
          ? safe(0, () => runScript(script, programExercise, dayData, settings).execute("rpe"))
          : key === "weightExpr"
          ? safe(Weight.build(0, settings.units), () =>
              runScript(script, programExercise, dayData, settings).execute("weight")
            )
          : 0;
      set[key] = Weight.printOrNumber(Weight.applyOp(onerm, oldValue, value, op));
    }
  }
}
