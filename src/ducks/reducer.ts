import { Reducer } from "preact/hooks";
import { Program, TProgram, IProgram, IProgramDay, TProgramDay, IProgramExcercise } from "../models/program";
import { IHistoryRecord, THistoryRecord } from "../models/history";
import { Progress, IProgressMode } from "../models/progress";
import { IExcerciseType } from "../models/excercise";
import { StateError } from "./stateError";
import { History } from "../models/history";
import { Screen, IScreen } from "../models/screen";
import { IWeight, Weight } from "../models/weight";
import deepmerge from "deepmerge";
import { CollectionUtils } from "../utils/collection";
import { Service } from "../api/service";
import { AudioInterface } from "../lib/audioInterface";
import { runMigrations } from "../migrations/runner";
import { ILensRecordingPayload, lf } from "../utils/lens";
import { ISettings, TSettings } from "../models/settings";
import * as IDB from "idb-keyval";
import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";
import RB from "rollbar";
import { IDispatch } from "./types";
import { getLatestMigrationVersion } from "../migrations/migrations";

declare let Rollbar: RB;

export type IEnv = {
  service: Service;
  audio: AudioInterface;
  googleAuth?: gapi.auth2.GoogleAuth;
};

export interface IState {
  email?: string;
  storage: IStorage;
  programs: IProgram[];
  webpushr?: IWebpushr;
  screenStack: IScreen[];
  currentHistoryRecord?: number;
  progress: Record<number, IHistoryRecord | undefined>;
  editProgram?: {
    id: string;
    dayIndex?: number;
  };
  editDay?: IProgramDay;
  editExcercise?: IProgramExcercise;
}

export const TStorage = t.type(
  {
    id: t.number,
    history: t.array(THistoryRecord),
    settings: TSettings,
    currentProgramId: t.union([t.string, t.undefined]),
    version: t.string,
    programs: t.array(TProgram),
  },
  "TStorage"
);
export type IStorage = t.TypeOf<typeof TStorage>;

export interface IWebpushr {
  sid: number;
}

export interface ILocalStorage {
  storage?: IStorage;
  progress?: IHistoryRecord;
  editDay?: IProgramDay;
}

export function updateState(dispatch: IDispatch, lensRecording: ILensRecordingPayload<IState>[], desc?: string): void {
  dispatch({ type: "UpdateState", lensRecording, desc });
}

export async function getInitialState(client: Window["fetch"], rawStorage?: string): Promise<IState> {
  if (rawStorage == null) {
    rawStorage = window.localStorage.getItem("liftosaur") || undefined;
  }
  let storage: ILocalStorage | undefined;
  if (rawStorage != null) {
    try {
      storage = JSON.parse(rawStorage);
    } catch (e) {
      storage = undefined;
    }
  }
  if (storage != null && storage.storage != null) {
    const finalStorage = await runMigrations(client, storage.storage);
    validateStorage(finalStorage, TStorage, "storage");
    const isProgressValid =
      storage.progress != null ? validateStorage(storage.progress, THistoryRecord, "progress") : false;

    const isEditDayValid = storage.editDay != null ? validateStorage(storage.editDay, TProgramDay, "editDay") : false;

    const screenStack: IScreen[] = finalStorage.currentProgramId ? ["main"] : ["programs"];

    return {
      storage: finalStorage,
      progress: isProgressValid ? { 0: storage.progress } : {},
      editDay: isEditDayValid ? storage.editDay : undefined,
      programs: [],
      currentHistoryRecord: 0,
      screenStack,
    };
  }
  return {
    screenStack: ["programs"],
    progress: {},
    programs: [],
    storage: {
      id: 0,
      currentProgramId: undefined,
      settings: {
        plates: [
          { weight: Weight.build(45, "lb"), num: 4 },
          { weight: Weight.build(25, "lb"), num: 4 },
          { weight: Weight.build(10, "lb"), num: 4 },
          { weight: Weight.build(5, "lb"), num: 4 },
          { weight: Weight.build(2.5, "lb"), num: 4 },
          { weight: Weight.build(1.25, "lb"), num: 2 },
          { weight: Weight.build(20, "kg"), num: 4 },
          { weight: Weight.build(10, "kg"), num: 4 },
          { weight: Weight.build(5, "kg"), num: 4 },
          { weight: Weight.build(2.5, "kg"), num: 4 },
          { weight: Weight.build(1.25, "kg"), num: 4 },
          { weight: Weight.build(0.5, "kg"), num: 2 },
        ],
        bars: {
          lb: {
            barbell: Weight.build(45, "lb"),
            ezbar: Weight.build(20, "lb"),
            dumbbell: Weight.build(10, "lb"),
          },
          kg: {
            barbell: Weight.build(20, "kg"),
            ezbar: Weight.build(10, "kg"),
            dumbbell: Weight.build(5, "kg"),
          },
        },
        timers: {
          warmup: 90,
          workout: 180,
        },
        units: "lb",
      },
      history: [],
      version: getLatestMigrationVersion(),
      programs: [],
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateStorage(data: object, type: t.Type<any, any, any>, name: string): boolean {
  const decoded = type.decode(data);
  if ("left" in decoded) {
    const error = PathReporter.report(decoded);
    if (Rollbar != null) {
      Rollbar.error(error.join("\n"), { state: JSON.stringify(data), type: name });
    }
    console.error(`Error decoding ${name}`);
    error.forEach((e) => console.error(e));
    return false;
  } else {
    return true;
  }
}

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
  weight: IWeight;
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
  weight: IWeight;
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

export type IUpdateStateAction = {
  type: "UpdateState";
  lensRecording: ILensRecordingPayload<IState>[];
  desc?: string;
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

export type ICreateProgramAction = {
  type: "CreateProgramAction";
  name: string;
};

export type ICreateDayAction = {
  type: "CreateDayAction";
};

export type IEditDayAction = {
  type: "EditDayAction";
  index: number;
};

export type ISaveProgressDay = {
  type: "SaveProgressDay";
};

export type ISaveExcercise = {
  type: "SaveExcercise";
};

export type ICardsAction = IChangeRepsAction | IChangeWeightAction | IChangeAMRAPAction | IConfirmWeightAction;

export type IAction =
  | ICardsAction
  | IStartProgramDayAction
  | IFinishProgramDayAction
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
  | IUpdateStateAction
  | IUpdateSettingsAction
  | IStoreWebpushrSidAction
  | ICreateProgramAction
  | ICreateDayAction
  | IEditDayAction
  | ISaveProgressDay
  | ISaveExcercise;

let timerId: number | undefined = undefined;

export const reducerWrapper: Reducer<IState, IAction> = (state, action) => {
  const newState = reducer(state, action);
  if (state.storage !== newState.storage) {
    newState.storage = {
      ...newState.storage,
      id: (newState.storage.id || 0) + 1,
      version: getLatestMigrationVersion(),
    };
  }
  const localStorage: ILocalStorage = {
    storage: newState.storage,
    progress: newState.progress[0],
    editDay: newState.editDay,
  };
  if (timerId != null) {
    window.clearTimeout(timerId);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).state = newState;
  timerId = window.setTimeout(() => {
    clearTimeout(timerId);
    timerId = undefined;
    IDB.set("liftosaur", JSON.stringify(localStorage)).catch((e) => {
      console.error(e);
    });
  }, 100);
  return newState;
};

export function buildCardsReducer(settings: ISettings): Reducer<IHistoryRecord, ICardsAction> {
  return (progress, action): IHistoryRecord => {
    switch (action.type) {
      case "ChangeRepsAction": {
        progress = Progress.updateRepsInExcercise(
          progress,
          action.excercise,
          action.weight,
          action.setIndex,
          action.mode
        );
        if (Progress.isFullyFinishedSet(progress)) {
          progress = Progress.stopTimer(progress);
        }
        return progress;
      }
      case "ChangeAMRAPAction": {
        return Progress.updateAmrapRepsInExcercise(progress, action.value);
      }
      case "ChangeWeightAction": {
        return Progress.showUpdateWeightModal(progress, action.excercise, action.weight);
      }
      case "ConfirmWeightAction": {
        return Progress.updateWeight(progress, settings, action.weight);
      }
    }
  };
}

export const reducer: Reducer<IState, IAction> = (state, action): IState => {
  if (action.type === "ChangeRepsAction") {
    return Progress.setProgress(state, buildCardsReducer(state.storage.settings)(Progress.getProgress(state)!, action));
  } else if (action.type === "ChangeAMRAPAction") {
    return Progress.setProgress(state, buildCardsReducer(state.storage.settings)(Progress.getProgress(state)!, action));
  } else if (action.type === "ChangeWeightAction") {
    return Progress.setProgress(state, buildCardsReducer(state.storage.settings)(Progress.getProgress(state)!, action));
  } else if (action.type === "ConfirmWeightAction") {
    return Progress.setProgress(state, buildCardsReducer(state.storage.settings)(Progress.getProgress(state)!, action));
  } else if (action.type === "StartProgramDayAction") {
    const progress = state.progress[0];
    if (progress != null) {
      return {
        ...state,
        currentHistoryRecord: progress.id,
        screenStack: Screen.push(state.screenStack, "progress"),
      };
    } else if (state.storage.currentProgramId != null) {
      // TODO: What if the program is missing?
      const program = state.storage.programs.find((p) => p.id === state.storage.currentProgramId)!;
      const newProgress = Program.nextProgramRecord(program, state.storage.settings);
      return {
        ...state,
        currentHistoryRecord: 0,
        screenStack: Screen.push(state.screenStack, "progress"),
        editDay: program.days[newProgress.day - 1],
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
    const settings = state.storage.settings;
    const progress = Progress.getProgress(state);
    if (progress == null) {
      throw new StateError("FinishProgramDayAction: no progress");
    } else {
      const historyRecord = History.finishProgramDay(progress);
      let newHistory;
      if (!Progress.isCurrent(progress)) {
        newHistory = state.storage.history.map((h) => (h.id === progress.id ? historyRecord : h));
      } else {
        newHistory = [historyRecord, ...state.storage.history];
      }
      const programIndex = state.storage.programs.findIndex((p) => p.id === progress.programId)!;
      const program = state.storage.programs[programIndex];
      const newProgram =
        Progress.isCurrent(progress) && program != null
          ? Program.runAllFinishDayScripts(program, progress, settings)
          : program;
      const newPrograms = lf(state.storage.programs).i(programIndex).set(newProgram);
      return {
        ...state,
        storage: {
          ...state.storage,
          history: newHistory,
          programs: newPrograms,
        },
        screenStack: Screen.pull(state.screenStack),
        currentHistoryRecord: undefined,
        editDay: undefined,
        progress: Progress.stop(state.progress, progress.id),
      };
    }
  } else if (action.type === "ChangeDate") {
    return Progress.setProgress(state, Progress.showUpdateDate(Progress.getProgress(state)!, action.date));
  } else if (action.type === "ConfirmDate") {
    return Progress.setProgress(state, Progress.changeDate(Progress.getProgress(state)!, action.date));
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
  } else if (action.type === "UpdateState") {
    return action.lensRecording.reduce((memo, recording) => recording.fn(memo), state);
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
          bars: newStorage.settings.bars,
          units: newStorage.settings.units,
        },
        currentProgramId: newStorage.currentProgramId,
        history: CollectionUtils.concatBy(oldStorage.history, newStorage.history, (el) => el.date!),
        version: newStorage.version,
        programs: newStorage.programs,
      };
      return { ...state, storage };
    } else {
      return state;
    }
  } else if (action.type === "CreateProgramAction") {
    let newState = lf(state)
      .p("storage")
      .p("programs")
      .modify((programs) => [
        ...programs,
        {
          id: action.name,
          name: action.name,
          url: "",
          author: "",
          description: action.name,
          nextDay: 1,
          days: [{ name: "Day 1", excercises: [] }],
          excercises: [],
          finishDayExpr: "",
          tags: [],
        },
      ]);
    newState = lf(newState).p("editProgram").set({ id: action.name });
    return lf(newState).p("screenStack").set(Screen.push(state.screenStack, "editProgram"));
  } else if (action.type === "CreateDayAction") {
    const program = Program.getEditingProgram(state)!;
    const programIndex = Program.getEditingProgramIndex(state)!;
    const days = program.days;
    const dayName = `Day ${days.length + 1}`;
    const newProgram = lf(program)
      .p("days")
      .modify((d) => [...d, Program.createDay(dayName)]);
    let newState = lf(state).p("storage").p("programs").i(programIndex).set(newProgram);
    newState = lf(newState)
      .pi("editProgram")
      .p("dayIndex")
      .set(newProgram.days.length - 1);
    return lf(newState).p("screenStack").set(Screen.push(state.screenStack, "editProgramDay"));
  } else if (action.type === "EditDayAction") {
    return {
      ...state,
      editProgram: {
        ...state.editProgram!,
        dayIndex: action.index,
      },
      screenStack: Screen.push(state.screenStack, "editProgramDay"),
    };
  } else if (action.type === "SaveProgressDay") {
    const progress = state.progress[0]!;
    const program = Program.getProgram(state, progress.programId)!;
    return {
      ...state,
      progress: {
        ...state.progress,
        0: Progress.applyProgramDay(progress, program, state.editDay!, state.storage.settings),
      },
      screenStack: Screen.pull(state.screenStack),
    };
  } else if (action.type === "SaveExcercise") {
    const programIndex = Program.getEditingProgramIndex(state);
    return {
      ...state,
      editExcercise: undefined,
      storage: lf(state.storage)
        .p("programs")
        .i(programIndex)
        .p("excercises")
        .modify((exc) => {
          const editExcercise = state.editExcercise!;
          const excercise = exc.find((e) => e.id === editExcercise.id);
          if (excercise != null) {
            return exc.map((e) => (e.id === editExcercise.id ? editExcercise : e));
          } else {
            return [...exc, editExcercise];
          }
        }),
      screenStack: Screen.pull(state.screenStack),
    };
  } else {
    return state;
  }
};
