import { IProgramExercise, IProgramState, IProgramExerciseVariation, IProgramExerciseWarmupSet } from "../types";

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

  export function getVariations(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[]
  ): IProgramExerciseVariation[] {
    return getProgramExercise(programExercise, allProgramExercises).variations;
  }

  export function getWarmupSets(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[]
  ): IProgramExerciseWarmupSet[] | undefined {
    return getProgramExercise(programExercise, allProgramExercises).warmupSets;
  }

  export function getProgramExercise<T>(
    programExercise: IProgramExercise,
    allProgramExercises: IProgramExercise[]
  ): IProgramExercise {
    const reuseLogicId = programExercise.reuseLogic?.selected;
    if (reuseLogicId != null) {
      const reusedProgramExercise = allProgramExercises.filter((pe) => pe.id === reuseLogicId)[0];
      if (reusedProgramExercise != null) {
        return reusedProgramExercise;
      }
    }

    return programExercise;
  }
}
