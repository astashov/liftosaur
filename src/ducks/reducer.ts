import { Reducer } from "preact/hooks";
import { Program, IProgramId } from "../models/program";
import { IHistoryRecord } from "../models/history";
import { IProgress, Progress } from "../models/progress";
import { IExcercise } from "../models/excercise";
import { StateError } from "./stateError";
import { History } from "../models/history";
import { IStats, Stats } from "../models/stats";

export interface IState {
  stats: IStats;
  current?: ICurrent;
  history: IHistoryRecord[];
}

export interface ICurrent {
  programId: IProgramId;
  progress?: IProgress;
}

export function getInitialState(): IState {
  const state = window.localStorage.getItem("liftosaur");
  let parsedState: IState | undefined;
  if (state != null) {
    try {
      parsedState = JSON.parse(state);
    } catch (e) {
      parsedState = undefined;
    }
  }
  if (parsedState != null) {
    return parsedState;
  } else {
    return {
      stats: {
        excercises: {}
      },
      history: []
    };
  }
}

export type IChangeProgramAction = {
  type: "ChangeProgramAction";
  name: IProgramId;
};

export type IChangeRepsAction = {
  type: "ChangeRepsAction";
  excercise: IExcercise;
  setIndex: number;
  weight: number;
};

export type IFinishProgramDayAction = {
  type: "FinishProgramDayAction";
};

export type IStartProgramDayAction = {
  type: "StartProgramDayAction";
};

export type IChangeAMRAP = {
  type: "ChangeAMRAP";
  value?: number;
};

export type IAction =
  | IChangeRepsAction
  | IStartProgramDayAction
  | IChangeProgramAction
  | IFinishProgramDayAction
  | IChangeAMRAP;

export const reducerWrapper: Reducer<IState, IAction> = (state, action) => {
  const newState = reducer(state, action);
  console.log(newState);
  window.localStorage.setItem("liftosaur", JSON.stringify(newState));
  return newState;
};

export const reducer: Reducer<IState, IAction> = (state, action) => {
  if (action.type === "ChangeRepsAction") {
    const current = state.current!;
    const progress = current.progress!;
    return {
      ...state,
      current: {
        ...current,
        progress: Progress.updateRepsInExcercise(
          progress,
          current.programId,
          action.excercise,
          action.weight,
          action.setIndex
        )
      }
    };
  } else if (action.type === "StartProgramDayAction") {
    const current = state.current!;
    if (current.progress != null) {
      throw new StateError("Progress is already started");
    } else {
      const lastHistoryRecord = state.history.find(i => i.programId === state.current?.programId);
      const program = Program.get(current.programId);
      const day = Program.nextDay(program, lastHistoryRecord?.day);
      return {
        ...state,
        current: { ...current, progress: Progress.create(program, day) }
      };
    }
  } else if (action.type === "FinishProgramDayAction") {
    const current = state.current!;
    if (current.progress == null) {
      throw new StateError("FinishProgramDayAction: no progress");
    } else {
      const program = Program.get(current.programId);
      const historyRecord = History.finishProgramDay(program, current.progress);
      return {
        ...state,
        stats: Stats.update(state.stats, program, current.progress),
        history: [historyRecord, ...state.history],
        current: { ...current, progress: undefined }
      };
    }
  } else if (action.type === "ChangeProgramAction") {
    return { ...state, current: { programId: action.name } };
  } else if (action.type === "ChangeAMRAP") {
    return {
      ...state,
      ...(state.current != null
        ? {
            current: {
              ...state.current,
              progress: Progress.updateAmrapRepsInExcercise(state.current!.progress!, action.value)
            }
          }
        : {})
    };
  } else {
    return state;
  }
};
