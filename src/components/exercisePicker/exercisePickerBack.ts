import { IExercisePickerState } from "../../types";

export function ExercisePickerBack_canPop(state: IExercisePickerState): boolean {
  return state.screenStack.length > 1;
}

export function ExercisePickerBack_pop(state: IExercisePickerState): IExercisePickerState {
  if (!ExercisePickerBack_canPop(state)) {
    return state;
  }
  const isLeavingCustomExercise = state.screenStack[state.screenStack.length - 1] === "customExercise";
  return {
    ...state,
    screenStack: state.screenStack.slice(0, -1),
    editCustomExercise: isLeavingCustomExercise ? undefined : state.editCustomExercise,
  };
}
