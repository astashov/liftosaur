import { IDispatch } from "../ducks/types";
import { lb } from "lens-shmens";
import { IState } from "./state";
import { IExercise, Exercise_toKey } from "./exercise";
import { IGraph, ISettings, IStatsLength, IStatsPercentage, IStatsWeight } from "../types";

export function EditGraphs_removeGraph(dispatch: IDispatch, graph: IGraph): void {
  dispatch({
    type: "UpdateState",
    lensRecording: [
      lb<IState>()
        .p("storage")
        .p("settings")
        .p("graphs")
        .p("graphs")
        .recordModify((exs) => {
          return exs.filter((ex) => ex.id !== graph.id);
        }),
    ],
    desc: `Remove graph ${graph.id}`,
  });
}

export function EditGraphs_reorderGraphs(dispatch: IDispatch, startIndex: number, endIndex: number): void {
  dispatch({
    type: "UpdateState",
    lensRecording: [
      lb<IState>()
        .p("storage")
        .p("settings")
        .p("graphs")
        .p("graphs")
        .recordModify((exs) => {
          const newExercises = [...exs];
          const [exercisesToMove] = newExercises.splice(startIndex, 1);
          newExercises.splice(endIndex, 0, exercisesToMove);
          return newExercises;
        }),
    ],
    desc: `Reorder graphs from index ${startIndex} to ${endIndex}`,
  });
}

export function EditGraphs_addExerciseGraph(dispatch: IDispatch, exercise: IExercise): void {
  dispatch({
    type: "UpdateState",
    lensRecording: [
      lb<IState>()
        .p("storage")
        .p("settings")
        .p("graphs")
        .p("graphs")
        .recordModify((ex) => {
          return Array.from(new Set([...ex, { vtype: "graph", type: "exercise", id: Exercise_toKey(exercise) }]));
        }),
    ],
    desc: `Add graph for exercise ${Exercise_toKey(exercise)}`,
  });
}

export function EditGraphs_addMuscleGroupGraph(dispatch: IDispatch, muscleGroup: string): void {
  dispatch({
    type: "UpdateState",
    lensRecording: [
      lb<IState>()
        .p("storage")
        .p("settings")
        .p("graphs")
        .p("graphs")
        .recordModify((ex) => {
          if (!ex.some((e) => e.type === "muscleGroup" && e.id === muscleGroup)) {
            return [...ex, { vtype: "graph", type: "muscleGroup", id: muscleGroup }];
          } else {
            return ex;
          }
        }),
    ],
    desc: `Add graph for muscle group ${muscleGroup}`,
  });
}

export function EditGraphs_addStatsWeightGraph(dispatch: IDispatch, statsKey: keyof IStatsWeight): void {
  dispatch({
    type: "UpdateSettings",
    lensRecording: lb<ISettings>()
      .p("graphs")
      .p("graphs")
      .recordModify((ex) => {
        return Array.from(new Set([...ex, { vtype: "graph", type: "statsWeight", id: statsKey }]));
      }),
    desc: `Add weight stat graph`,
  });
}

export function EditGraphs_addStatsLengthGraph(dispatch: IDispatch, statsKey: keyof IStatsLength): void {
  dispatch({
    type: "UpdateSettings",
    lensRecording: lb<ISettings>()
      .p("graphs")
      .p("graphs")
      .recordModify((ex) => {
        return Array.from(new Set([...ex, { vtype: "graph", type: "statsLength", id: statsKey }]));
      }),
    desc: `Add length stat graph`,
  });
}

export function EditGraphs_addStatsPercentageGraph(dispatch: IDispatch, statsKey: keyof IStatsPercentage): void {
  dispatch({
    type: "UpdateSettings",
    lensRecording: lb<ISettings>()
      .p("graphs")
      .p("graphs")
      .recordModify((ex) => {
        return Array.from(new Set([...ex, { vtype: "graph", type: "statsPercentage", id: statsKey }]));
      }),
    desc: `Add percentage stat graph`,
  });
}
