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
  storage: IStorage;
  webpushr?: IWebpushr;
  progress?: IProgress;
}

export interface IStorage {
  stats: IStats;
  history: IHistoryRecord[];
  settings: ISettings;
  currentProgramId?: IProgramId;
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

export function getInitialState(): IState {
  const rawStorage = window.localStorage.getItem("liftosaur");
  let storage: IStorage | undefined;
  if (rawStorage != null) {
    try {
      storage = JSON.parse(rawStorage);
    } catch (e) {
      storage = undefined;
    }
  }
  if (storage != null) {
    return { storage };
  } else {
    return {
      storage: {
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
      }
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
  window.localStorage.setItem("liftosaur", JSON.stringify(newState.storage));
  return newState;
};

export const reducer: Reducer<IState, IAction> = (state, action) => {
  if (action.type === "ChangeRepsAction") {
    const progress = state.progress!;
    return {
      ...state,
      progress: Progress.updateRepsInExcercise(
        progress,
        state.storage.currentProgramId!,
        action.excercise,
        action.weight,
        action.setIndex,
        action.mode
      )
    };
  } else if (action.type === "StartProgramDayAction") {
    if (state.progress != null) {
      throw new StateError("Progress is already started");
    } else if (state.storage.currentProgramId != null) {
      const lastHistoryRecord = state.storage.history.find(i => i.programId === state.storage.currentProgramId);
      const program = Program.get(state.storage.currentProgramId);
      const day = Program.nextDay(program, lastHistoryRecord?.day);
      return {
        ...state,
        progress: Progress.create(program, day, state.storage.stats)
      };
    } else {
      return state;
    }
  } else if (action.type === "FinishProgramDayAction") {
    if (state.progress == null) {
      throw new StateError("FinishProgramDayAction: no progress");
    } else {
      const program = Program.get(state.storage.currentProgramId!);
      const historyRecord = History.finishProgramDay(program, state.progress, state.storage.stats);
      return {
        ...state,
        storage: {
          ...state.storage,
          stats: Stats.update(state.storage.stats, program, state.progress),
          history: [historyRecord, ...state.storage.history]
        },
        progress: undefined
      };
    }
  } else if (action.type === "ChangeProgramAction") {
    return {
      ...state,
      storage: {
        ...state.storage,
        currentProgramId: action.name
      }
    };
  } else if (action.type === "ChangeAMRAPAction") {
    return {
      ...state,
      progress: Progress.updateAmrapRepsInExcercise(state.progress!, action.value)
    };
  } else if (action.type === "ChangeWeightAction") {
    return {
      ...state,
      progress: Progress.showUpdateWeightModal(state.progress!, action.excercise, action.weight)
    };
  } else if (action.type === "ConfirmWeightAction") {
    return {
      ...state,
      progress: Progress.updateWeight(state.progress!, action.weight)
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
