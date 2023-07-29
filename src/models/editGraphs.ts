import { IDispatch } from "../ducks/types";
import { lb } from "lens-shmens";
import { IState } from "./state";
import { IExercise } from "./exercise";
import { IGraph, ISettings, IStatsLength, IStatsPercentage, IStatsWeight } from "../types";

export namespace EditGraphs {
  export function removeGraph(dispatch: IDispatch, graph: IGraph): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [
        lb<IState>()
          .p("storage")
          .p("settings")
          .p("graphs")
          .recordModify((exs) => {
            return exs.filter((ex) => ex.id !== graph.id);
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

  export function addExerciseGraph(dispatch: IDispatch, exercise: IExercise): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [
        lb<IState>()
          .p("storage")
          .p("settings")
          .p("graphs")
          .recordModify((ex) => {
            return Array.from(new Set([...ex, { type: "exercise", id: exercise.id }]));
          }),
      ],
    });
  }

  export function addMuscleGroupGraph(dispatch: IDispatch, muscleGroup: string): void {
    dispatch({
      type: "UpdateState",
      lensRecording: [
        lb<IState>()
          .p("storage")
          .p("settings")
          .p("graphs")
          .recordModify((ex) => {
            if (!ex.some((e) => e.type === "muscleGroup" && e.id === muscleGroup)) {
              return [...ex, { type: "muscleGroup", id: muscleGroup }];
            } else {
              return ex;
            }
          }),
      ],
    });
  }

  export function addStatsWeightGraph(dispatch: IDispatch, statsKey: keyof IStatsWeight): void {
    dispatch({
      type: "UpdateSettings",
      lensRecording: lb<ISettings>()
        .p("graphs")
        .recordModify((ex) => {
          return Array.from(new Set([...ex, { type: "statsWeight", id: statsKey }]));
        }),
    });
  }

  export function addStatsLengthGraph(dispatch: IDispatch, statsKey: keyof IStatsLength): void {
    dispatch({
      type: "UpdateSettings",
      lensRecording: lb<ISettings>()
        .p("graphs")
        .recordModify((ex) => {
          return Array.from(new Set([...ex, { type: "statsLength", id: statsKey }]));
        }),
    });
  }

  export function addStatsPercentageGraph(dispatch: IDispatch, statsKey: keyof IStatsPercentage): void {
    dispatch({
      type: "UpdateSettings",
      lensRecording: lb<ISettings>()
        .p("graphs")
        .recordModify((ex) => {
          return Array.from(new Set([...ex, { type: "statsPercentage", id: statsKey }]));
        }),
    });
  }
}
