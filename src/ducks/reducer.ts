import { Reducer } from "preact/hooks";
import { Program, IProgramId, defaultProgramStates } from "../models/program";
import { IHistoryRecord } from "../models/history";
import { Progress, IProgressMode } from "../models/progress";
import { IExcerciseType } from "../models/excercise";
import { StateError } from "./stateError";
import { History } from "../models/history";
import { Screen, IScreen } from "../models/screen";
import { IStats } from "../models/stats";
import { IWeight } from "../models/weight";
import deepmerge from "deepmerge";
import { CollectionUtils } from "../utils/collection";
import { Service } from "../api/service";
import { AudioInterface } from "../lib/audioInterface";
import { DateUtils } from "../utils/date";
import { runMigrations } from "../migrations/runner";
import { ILensRecordingPayload, lf } from "../utils/lens";
import { ISettings } from "../models/settings";

export type IEnv = {
  service: Service;
  audio: AudioInterface;
  googleAuth?: gapi.auth2.GoogleAuth;
};

export interface IState {
  email?: string;
  storage: IStorage;
  webpushr?: IWebpushr;
  screenStack: IScreen[];
  currentHistoryRecord?: number;
  progress: Record<number, IHistoryRecord | undefined>;
}

export interface IStorage {
  id: number;
  stats: IStats;
  history: IHistoryRecord[];
  settings: ISettings;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  programStates: Record<string, any>;
  currentProgramId?: IProgramId;
  version: string;
}

export interface IWebpushr {
  sid: number;
}

export interface ILocalStorage {
  storage?: IStorage;
  progress?: IHistoryRecord;
}

export function getInitialState(): IState {
  const rawStorage = window.localStorage.getItem("liftosaur");
  let storage: ILocalStorage | undefined;
  if (rawStorage != null) {
    try {
      storage = JSON.parse(rawStorage);
    } catch (e) {
      storage = undefined;
    }
  }
  if (storage != null && storage.storage != null) {
    return {
      storage: runMigrations(storage.storage),
      progress: storage.progress ? { 0: storage.progress } : {},
      currentHistoryRecord: 0,
      screenStack: ["main"],
    };
  }
  return {
    screenStack: ["main"],
    progress: {},
    storage: {
      id: 0,
      stats: {
        excercises: {},
      },
      programStates: {},
      settings: {
        plates: [
          { weight: 45, num: 4 },
          { weight: 25, num: 4 },
          { weight: 10, num: 4 },
          { weight: 5, num: 4 },
          { weight: 2.5, num: 4 },
          { weight: 1.25, num: 2 },
        ],
        timers: {
          warmup: 90,
          workout: 180,
        },
      },
      history: [],
      version: DateUtils.formatYYYYMMDDHHMM(Date.now()),
    },
  };
}

export type IUpdateProgramState = {
  type: "UpdateProgramState";
  name: IProgramId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lensRecording: ILensRecordingPayload<any>;
};

export type IChangeProgramAction = {
  type: "ChangeProgramAction";
  name: IProgramId;
};

export type IChangeDate = {
  type: "ChangeDate";
  date: string;
};

export type IConfirmDate = {
  type: "ConfirmDate";
  date?: string;
};

export type ISyncStorage = {
  type: "SyncStorage";
  storage: IStorage;
};

export type ILoginAction = {
  type: "Login";
  email: string;
};

export type ILogoutAction = {
  type: "Logout";
};

export type IPushScreen = {
  type: "PushScreen";
  screen: IScreen;
};

export type IPullScreen = {
  type: "PullScreen";
};

export type ICancelProgress = {
  type: "CancelProgress";
};

export type IDeleteProgress = {
  type: "DeleteProgress";
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

export type IUpdateSettingsAction = {
  type: "UpdateSettings";
  lensRecording: ILensRecordingPayload<ISettings>;
};

export type IStoreWebpushrSidAction = {
  type: "StoreWebpushrSidAction";
  sid: number;
};

export type IEditHistoryRecordAction = {
  type: "EditHistoryRecord";
  historyRecord: IHistoryRecord;
};

export type IStartTimer = {
  type: "StartTimer";
  timestamp: number;
  mode: IProgressMode;
};

export type IStopTimer = {
  type: "StopTimer";
};

export type IAction =
  | IChangeRepsAction
  | IStartProgramDayAction
  | IChangeProgramAction
  | IFinishProgramDayAction
  | IChangeWeightAction
  | IChangeAMRAPAction
  | IConfirmWeightAction
  | IEditHistoryRecordAction
  | ICancelProgress
  | IDeleteProgress
  | IPushScreen
  | IPullScreen
  | ISyncStorage
  | IChangeDate
  | IConfirmDate
  | ILoginAction
  | ILogoutAction
  | IStartTimer
  | IStopTimer
  | IUpdateSettingsAction
  | IUpdateProgramState
  | IStoreWebpushrSidAction;

export const reducerWrapper: Reducer<IState, IAction> = (state, action) => {
  console.log("Action: ", action);
  const newState = reducer(state, action);
  console.log(newState);
  if (state.storage !== newState.storage) {
    newState.storage = {
      ...newState.storage,
      id: (newState.storage.id || 0) + 1,
      version: DateUtils.formatYYYYMMDDHHMM(Date.now()),
    };
  }
  const localStorage: ILocalStorage = { storage: newState.storage, progress: newState.progress[0] };
  window.localStorage.setItem("liftosaur", JSON.stringify(localStorage));
  return newState;
};

export const reducer: Reducer<IState, IAction> = (state, action): IState => {
  if (action.type === "ChangeRepsAction") {
    let progress = Progress.getProgress(state)!;
    progress = Progress.updateRepsInExcercise(progress, action.excercise, action.weight, action.setIndex, action.mode);
    if (Progress.isFullyFinishedSet(progress)) {
      progress = Progress.stopTimer(progress);
    }
    return Progress.setProgress(state, progress);
  } else if (action.type === "StartProgramDayAction") {
    const progress = state.progress[0];
    if (progress != null) {
      return {
        ...state,
        currentHistoryRecord: progress.id,
        screenStack: Screen.push(state.screenStack, "progress"),
      };
    } else if (state.storage.currentProgramId != null) {
      const lastHistoryRecord = state.storage.history.find((i) => i.programId === state.storage.currentProgramId);
      const program = Program.get(state.storage.currentProgramId);
      const day = Program.nextDay(program, lastHistoryRecord?.day);
      const programState = state.storage.programStates[state.storage.currentProgramId];
      const newProgress = Progress.create(program, day, state.storage.stats, programState);
      return {
        ...state,
        currentHistoryRecord: 0,
        screenStack: Screen.push(state.screenStack, "progress"),
        progress: { ...state.progress, 0: newProgress },
      };
    } else {
      return state;
    }
  } else if (action.type === "EditHistoryRecord") {
    return {
      ...state,
      currentHistoryRecord: action.historyRecord.id,
      screenStack: Screen.push(state.screenStack, "progress"),
      progress: { ...state.progress, [action.historyRecord.id]: action.historyRecord },
    };
  } else if (action.type === "FinishProgramDayAction") {
    const progress = Progress.getProgress(state);
    if (progress == null) {
      throw new StateError("FinishProgramDayAction: no progress");
    } else {
      const program = Program.get(progress.programId);
      const historyRecord = History.finishProgramDay(progress);
      let newHistory;
      if (!Progress.isCurrent(progress)) {
        newHistory = state.storage.history.map((h) => (h.id === progress.id ? historyRecord : h));
      } else {
        newHistory = [historyRecord, ...state.storage.history];
      }
      const programState = state.storage.programStates[program.id];
      const { state: newProgramState, stats: newStats } = Progress.isCurrent(progress)
        ? program.finishDay(progress, state.storage.stats, programState)
        : { state: programState, stats: state.storage.stats };
      return {
        ...state,
        storage: {
          ...state.storage,
          stats: newStats,
          history: newHistory,
          programStates: {
            ...state.storage.programStates,
            [program.id]: newProgramState,
          },
        },
        screenStack: Screen.pull(state.screenStack),
        currentHistoryRecord: undefined,
        progress: Progress.stop(state.progress, progress.id),
      };
    }
  } else if (action.type === "ChangeProgramAction") {
    const currentProgramId = action.name;
    const programState = state.storage.programStates[currentProgramId] || defaultProgramStates[currentProgramId];
    return {
      ...state,
      storage: {
        ...state.storage,
        programStates: {
          ...state.storage.programStates,
          [currentProgramId]: programState,
        },
        currentProgramId: action.name,
      },
    };
  } else if (action.type === "ChangeAMRAPAction") {
    return Progress.setProgress(state, Progress.updateAmrapRepsInExcercise(Progress.getProgress(state)!, action.value));
  } else if (action.type === "ChangeDate") {
    return Progress.setProgress(state, Progress.showUpdateDate(Progress.getProgress(state)!, action.date));
  } else if (action.type === "ConfirmDate") {
    return Progress.setProgress(state, Progress.changeDate(Progress.getProgress(state)!, action.date));
  } else if (action.type === "ChangeWeightAction") {
    return Progress.setProgress(
      state,
      Progress.showUpdateWeightModal(Progress.getProgress(state)!, action.excercise, action.weight)
    );
  } else if (action.type === "ConfirmWeightAction") {
    return Progress.setProgress(state, Progress.updateWeight(Progress.getProgress(state)!, action.weight));
  } else if (action.type === "StoreWebpushrSidAction") {
    return {
      ...state,
      webpushr: { sid: action.sid },
    };
  } else if (action.type === "CancelProgress") {
    const progress = Progress.getProgress(state)!;
    return {
      ...state,
      currentHistoryRecord: undefined,
      screenStack: Screen.pull(state.screenStack),
      progress: Progress.isCurrent(progress)
        ? state.progress
        : Progress.stop(state.progress, state.currentHistoryRecord!),
    };
  } else if (action.type === "DeleteProgress") {
    const progress = Progress.getProgress(state);
    if (progress != null) {
      const history = state.storage.history.filter((h) => h.id !== progress.id);
      return {
        ...state,
        currentHistoryRecord: undefined,
        screenStack: Screen.pull(state.screenStack),
        storage: { ...state.storage, history },
        progress: Progress.stop(state.progress, progress.id),
      };
    } else {
      return state;
    }
  } else if (action.type === "PushScreen") {
    if (state.screenStack.length > 0 && state.screenStack[state.screenStack.length - 1] !== action.screen) {
      return { ...state, screenStack: Screen.push(state.screenStack, action.screen) };
    } else {
      return state;
    }
  } else if (action.type === "PullScreen") {
    return { ...state, screenStack: Screen.pull(state.screenStack) };
  } else if (action.type === "Login") {
    return { ...state, email: action.email };
  } else if (action.type === "Logout") {
    return { ...state, email: undefined };
  } else if (action.type === "StartTimer") {
    return Progress.setProgress(
      state,
      Progress.startTimer(Progress.getProgress(state)!, action.timestamp, action.mode)
    );
  } else if (action.type === "StopTimer") {
    return Progress.setProgress(state, Progress.stopTimer(Progress.getProgress(state)!));
  } else if (action.type === "UpdateSettings") {
    return {
      ...state,
      storage: {
        ...state.storage,
        settings: action.lensRecording.fn(state.storage.settings),
      },
    };
  } else if (action.type === "SyncStorage") {
    const oldStorage = state.storage;
    const newStorage = action.storage;
    if (newStorage?.id != null && oldStorage?.id != null && newStorage.id > oldStorage.id) {
      const storage: IStorage = {
        id: newStorage.id,
        settings: {
          plates: CollectionUtils.concatBy(oldStorage.settings.plates, newStorage.settings.plates, (el) =>
            el.weight.toString()
          ),
          timers: deepmerge(oldStorage.settings.timers, newStorage.settings.timers),
        },
        programStates: deepmerge(oldStorage.programStates, newStorage.programStates),
        stats: deepmerge(oldStorage.stats, newStorage.stats),
        currentProgramId: newStorage.currentProgramId,
        history: CollectionUtils.concatBy(oldStorage.history, newStorage.history, (el) => el.date!),
        version: newStorage.version,
      };
      return { ...state, storage };
    } else {
      return state;
    }
  } else if (action.type === "UpdateProgramState") {
    const oldState = state.storage.programStates[action.name];
    const newState = action.lensRecording.fn(oldState);

    return lf(state).p("storage").p("programStates").p(action.name).set(newState);
  } else {
    return state;
  }
};
