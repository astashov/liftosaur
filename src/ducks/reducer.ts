import { Reducer } from "preact/hooks";
import { Program, IProgramId } from "../models/program";
import { IHistoryRecord } from "../models/history";
import { IProgress, Progress, IProgressMode } from "../models/progress";
import { IExcerciseType } from "../models/excercise";
import { StateError } from "./stateError";
import { History } from "../models/history";
import { IStats, Stats } from "../models/stats";
import { IWeight, IPlate } from "../models/weight";

export interface IState {
  stats: IStats;
  current?: ICurrent;
  history: IHistoryRecord[];
  settings: ISettings;
  webpushr?: IWebpushr;
}

export interface ISettings {
  timers: {
    warmup: number;
    workout: number;
  };
  plates: IPlate[];
}

export interface IWebpushr {
  sid: number;
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
      settings: {
        plates: [
          { weight: 45, num: 4 },
          { weight: 25, num: 4 },
          { weight: 10, num: 4 },
          { weight: 5, num: 4 },
          { weight: 2.5, num: 4 }
        ],
        timers: {
          warmup: 90000,
          workout: 180000
        }
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
  excercise: IExcerciseType;
  setIndex: number;
  weight: number;
  mode: IProgressMode;
};

export type IFinishProgramDayAction = {
  type: "FinishProgramDayAction";
};

export type IStartProgramDayAction = {
  type: "StartProgramDayAction";
};

export type IChangeAMRAPAction = {
  type: "ChangeAMRAPAction";
  value?: number;
};

export type IChangeWeightAction = {
  type: "ChangeWeightAction";
  weight: number;
  excercise: IExcerciseType;
};

export type IConfirmWeightAction = {
  type: "ConfirmWeightAction";
  weight?: IWeight;
};

export type IStoreWebpushrSidAction = {
  type: "StoreWebpushrSidAction";
  sid: number;
};

export type IAction =
  | IChangeRepsAction
  | IStartProgramDayAction
  | IChangeProgramAction
  | IFinishProgramDayAction
  | IChangeWeightAction
  | IChangeAMRAPAction
  | IConfirmWeightAction
  | IStoreWebpushrSidAction;

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
          action.setIndex,
          action.mode
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
        current: { ...current, progress: Progress.create(program, day, state.stats) }
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
  } else if (action.type === "ChangeAMRAPAction") {
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
  } else if (action.type === "ChangeWeightAction") {
    return {
      ...state,
      ...(state.current != null
        ? {
            current: {
              ...state.current,
              progress: Progress.showUpdateWeightModal(state.current!.progress!, action.excercise, action.weight)
            }
          }
        : {})
    };
  } else if (action.type === "ConfirmWeightAction") {
    return {
      ...state,
      ...(state.current != null
        ? {
            current: {
              ...state.current,
              progress: Progress.updateWeight(state.current!.progress!, action.weight)
            }
          }
        : {})
    };
  } else if (action.type === "StoreWebpushrSidAction") {
    return {
      ...state,
      webpushr: { sid: action.sid }
    };
  } else {
    return state;
  }
};
