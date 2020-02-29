import { Reducer } from "preact/hooks";
import { ivySaurProgram, IProgram } from "../models/program";
import { excercises, IExcercise } from "../models/excercise";

export interface IState {
  programs: IProgram[];
  current?: {
    program: IProgram;
    progress?: IProgress;
  };
  history: HistoryRecord[];
}

export interface IProgress {
  day: number;
  isFinished: boolean;
  entries: HistoryEntry[];
}

export interface HistoryRecord {
  date: string; // ISO8601, like 2020-02-29T18:02:05+00:00
  entries: HistoryEntry[];
}

export interface HistoryEntry {
  excercise: IExcercise;
  reps: number[];
  weight: number;
}

export function getInitialState(): IState {
  return {
    programs: [ivySaurProgram],
    current: {
      program: ivySaurProgram,
      progress: {
        day: 0,
        isFinished: false,
        entries: [
          {
            excercise: excercises.benchPress,
            reps: [4, 4, 3],
            weight: 150
          }
        ]
      }
    },
    history: []
  };
}

type IAction = {};

export const reducer: Reducer<IState, IAction> = (state, action) => {
  return state;
};
