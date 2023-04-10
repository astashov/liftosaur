import {
  IProgramExercise,
  IProgramState,
  IProgramExerciseVariation,
  IProgramExerciseWarmupSet,
  ISettings,
  IHistoryRecord,
  IHistoryEntry,
  IProgramSet,
} from "../types";
import { Program } from "./program";
import { History } from "./history";
import { ProgramSet } from "./programSet";
import { IProgramStateMetadata, IWeight } from "../types";
import { ObjectUtils } from "../utils/object";

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
      newState[key] = aState[key] || bState[key];
    }
    return newState;
  }

  export function getFinishDayScript(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[]
  ): string {
    return getProgramExercise(programExercise, allProgramExercises).finishDayExpr;
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

  export function getWarmupSets(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[]
  ): IProgramExerciseWarmupSet[] | undefined {
    return getProgramExercise(programExercise, allProgramExercises).warmupSets;
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

  export function getProgramExercise<T>(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[]
  ): IProgramExercise {
    return getReusedProgramExercise(programExercise, allProgramExercises) || programExercise;
  }

  export function approxTimeMs(
    dayIndex: number,
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[],
    settings: ISettings
  ): number {
    const programExerciseVariations = getVariations(programExercise, allProgramExercises);
    const nextVariationIndex = Program.nextVariationIndex(programExercise, allProgramExercises, dayIndex, settings);
    const variation = programExerciseVariations[nextVariationIndex];
    return variation.sets.reduce(
      (memo, set) => memo + ProgramSet.approxTimeMs(set, dayIndex, programExercise, allProgramExercises, settings),
      0
    );
  }

  export function getStateVariableType(value: number | IWeight): "number" | "kg" | "lb" {
    if (typeof value === "number") {
      return "number";
    } else {
      return value.unit;
    }
  }

  export function buildProgress(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[],
    day: number,
    settings: ISettings
  ): IHistoryRecord | undefined {
    let entry: IHistoryEntry | undefined;
    let variationIndex = 0;
    try {
      variationIndex = Program.nextVariationIndex(programExercise, allProgramExercises, day, settings);
    } catch (_) {}
    try {
      entry = Program.nextHistoryEntry(
        programExercise.exerciseType,
        day,
        ProgramExercise.getVariations(programExercise, allProgramExercises)[variationIndex].sets,
        ProgramExercise.getState(programExercise, allProgramExercises),
        settings,
        ProgramExercise.getWarmupSets(programExercise, allProgramExercises)
      );
    } catch (e) {
      entry = undefined;
    }
    return entry != null ? History.buildFromEntry(entry, day) : undefined;
  }
}
