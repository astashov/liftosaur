import { IDispatch } from "../ducks/types";
import { lb } from "lens-shmens";
import { IState } from "./state";
import { IExercise } from "./exercise";

export namespace EditGraphs {
  export function removeGraph(dispatch: IDispatch, exercise: IExercise): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [
        lb<IState>()
          .p("storage")
          .p("settings")
          .p("graphs")
          .recordModify((exs) => {
            return exs.filter((ex) => ex !== exercise.id);
          }),
      ],
    });
  }

  export function reorderGraphs(dispatch: IDispatch, startIndex: number, endIndex: number): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [
        lb<IState>()
          .p("storage")
          .p("settings")
          .p("graphs")
          .recordModify((exs) => {
            const newExercises = [...exs];
            const [exercisesToMove] = newExercises.splice(startIndex, 1);
            newExercises.splice(endIndex, 0, exercisesToMove);
            return newExercises;
          }),
      ],
    });
  }

  export function addGraph(dispatch: IDispatch, exercise: IExercise): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [
        lb<IState>()
          .p("storage")
          .p("settings")
          .p("graphs")
          .recordModify((ex) => {
            return Array.from(new Set([...ex, exercise.id]));
          }),
      ],
    });
  }
}
