import { Reducer } from "preact/hooks";
import { Program } from "../models/program";
import { Progress } from "../models/progress";
import { StateError } from "./stateError";
import { History } from "../models/history";
import { Screen, IScreen } from "../models/screen";
import { Weight } from "../models/weight";
import deepmerge from "deepmerge";
import { CollectionUtils } from "../utils/collection";
import { runMigrations } from "../migrations/runner";
import { ILensRecordingPayload, lf } from "lens-shmens";
import * as IDB from "idb-keyval";
import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";
import RB from "rollbar";
import { getLatestMigrationVersion } from "../migrations/migrations";
import { ILocalStorage, IState } from "../models/state";
import { UidFactory } from "../utils/generator";
import {
  TStorage,
  THistoryRecord,
  IStorage,
  IExerciseType,
  IWeight,
  IProgressMode,
  ISettings,
  IHistoryRecord,
  IProgram,
} from "../types";
import { Settings } from "../models/settings";

declare let Rollbar: RB;
const isLoggingEnabled = !!new URL(window.location.href).searchParams.get("log");

export function getIdbKey(userId?: string, isAdmin?: boolean): string {
  return userId != null && isAdmin ? `liftosaur_${userId}` : "liftosaur";
}

export async function getInitialState(client: Window["fetch"], userId?: string, rawStorage?: string): Promise<IState> {
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

    const screenStack: IScreen[] = finalStorage.currentProgramId ? ["main"] : ["programs"];

    return {
      storage: finalStorage,
      progress: isProgressValid ? { 0: storage.progress } : {},
      programs: [],
      currentHistoryRecord: 0,
      screenStack,
      user: userId ? { email: userId, id: userId } : undefined,
    };
  }
  return {
    screenStack: ["programs"],
    progress: {},
    programs: [],
    storage: {
      id: 0,
      currentProgramId: undefined,
      tempUserId: UidFactory.generateUid(10),
      stats: {
        weight: {},
        length: {},
      },
      settings: Settings.build(),
      history: [],
      version: getLatestMigrationVersion(),
      programs: [],
      helps: [],
    },
    user: userId ? { email: userId, id: userId } : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateStorage(data: Record<string, unknown>, type: t.Type<any, any, any>, name: string): boolean {
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
  userId: string;
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
  exercise: IExerciseType;
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
  exercise: IExerciseType;
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

export type IApplyProgramChangesToProgress = {
  type: "ApplyProgramChangesToProgress";
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
  | IApplyProgramChangesToProgress;

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
  };
  if (timerId != null) {
    window.clearTimeout(timerId);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).state = newState;
  timerId = window.setTimeout(() => {
    clearTimeout(timerId);
    timerId = undefined;
    IDB.set(getIdbKey(newState.user?.id, !!newState.adminKey), JSON.stringify(localStorage)).catch((e) => {
      console.error(e);
    });
  }, 100);
  return newState;
};

export function buildCardsReducer(settings: ISettings): Reducer<IHistoryRecord, ICardsAction> {
  return (progress, action): IHistoryRecord => {
    switch (action.type) {
      case "ChangeRepsAction": {
        progress = Progress.updateRepsInExercise(
          progress,
          action.exercise,
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
        return Progress.updateAmrapRepsInExercise(progress, action.value);
      }
      case "ChangeWeightAction": {
        return Progress.showUpdateWeightModal(progress, action.exercise, action.weight);
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
        screenStack: Progress.isCurrent(progress) ? ["finishDay"] : Screen.pull(state.screenStack),
        currentHistoryRecord: undefined,
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
    return { ...state, user: { email: action.email, id: action.userId } };
  } else if (action.type === "Logout") {
    return { ...state, user: undefined };
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
    if (isLoggingEnabled) {
      console.log(`%c-------${action.desc ? ` ${action.desc}` : ""}`, "font-weight:bold");
    }
    return action.lensRecording.reduce((memo, recording) => {
      if (isLoggingEnabled) {
        recording.log("state");
      }
      const newState = recording.fn(memo);
      if (isLoggingEnabled && recording.type === "modify") {
        console.log("New Value: ", recording.value.v);
      }
      return newState;
    }, state);
  } else if (action.type === "SyncStorage") {
    const oldStorage = state.storage;
    const newStorage = action.storage;
    if (newStorage?.id != null && oldStorage?.id != null && newStorage.id > oldStorage.id) {
      const storage: IStorage = {
        id: newStorage.id,
        stats: {
          weight: {
            weight: CollectionUtils.concatBy(
              oldStorage.stats.weight.weight || [],
              newStorage.stats.weight.weight || [],
              (el) => `${el.timestamp}`
            ),
          },
          length: {
            neck: CollectionUtils.concatBy(
              oldStorage.stats.length.neck || [],
              newStorage.stats.length.neck || [],
              (el) => `${el.timestamp}`
            ),
            shoulders: CollectionUtils.concatBy(
              oldStorage.stats.length.shoulders || [],
              newStorage.stats.length.shoulders || [],
              (el) => `${el.timestamp}`
            ),
            bicepLeft: CollectionUtils.concatBy(
              oldStorage.stats.length.bicepLeft || [],
              newStorage.stats.length.bicepLeft || [],
              (el) => `${el.timestamp}`
            ),
            bicepRight: CollectionUtils.concatBy(
              oldStorage.stats.length.bicepRight || [],
              newStorage.stats.length.bicepRight || [],
              (el) => `${el.timestamp}`
            ),
            forearmLeft: CollectionUtils.concatBy(
              oldStorage.stats.length.forearmLeft || [],
              newStorage.stats.length.forearmLeft || [],
              (el) => `${el.timestamp}`
            ),
            forearmRight: CollectionUtils.concatBy(
              oldStorage.stats.length.forearmRight || [],
              newStorage.stats.length.forearmRight || [],
              (el) => `${el.timestamp}`
            ),
            chest: CollectionUtils.concatBy(
              oldStorage.stats.length.chest || [],
              newStorage.stats.length.chest || [],
              (el) => `${el.timestamp}`
            ),
            waist: CollectionUtils.concatBy(
              oldStorage.stats.length.waist || [],
              newStorage.stats.length.waist || [],
              (el) => `${el.timestamp}`
            ),
            hips: CollectionUtils.concatBy(
              oldStorage.stats.length.hips || [],
              newStorage.stats.length.hips || [],
              (el) => `${el.timestamp}`
            ),
            thighLeft: CollectionUtils.concatBy(
              oldStorage.stats.length.thighLeft || [],
              newStorage.stats.length.thighLeft || [],
              (el) => `${el.timestamp}`
            ),
            thighRight: CollectionUtils.concatBy(
              oldStorage.stats.length.thighRight || [],
              newStorage.stats.length.thighRight || [],
              (el) => `${el.timestamp}`
            ),
            calfLeft: CollectionUtils.concatBy(
              oldStorage.stats.length.calfLeft || [],
              newStorage.stats.length.calfLeft || [],
              (el) => `${el.timestamp}`
            ),
            calfRight: CollectionUtils.concatBy(
              oldStorage.stats.length.calfRight || [],
              newStorage.stats.length.calfRight || [],
              (el) => `${el.timestamp}`
            ),
          },
        },
        settings: {
          plates: CollectionUtils.concatBy(
            oldStorage.settings.plates,
            newStorage.settings.plates,
            (el) => `${el.weight.value}${el.weight.unit}`
          ),
          lengthUnits: newStorage.settings.lengthUnits,
          statsEnabled: newStorage.settings.statsEnabled,
          graphs: newStorage.settings.graphs || [],
          timers: deepmerge(oldStorage.settings.timers, newStorage.settings.timers),
          bars: newStorage.settings.bars,
          units: newStorage.settings.units,
        },
        tempUserId: newStorage.tempUserId || UidFactory.generateUid(10),
        currentProgramId: newStorage.currentProgramId,
        history: CollectionUtils.concatBy(oldStorage.history, newStorage.history, (el) => el.date!),
        version: newStorage.version,
        programs: newStorage.programs,
        helps: newStorage.helps,
      };
      return { ...state, storage };
    } else {
      return state;
    }
  } else if (action.type === "CreateProgramAction") {
    const newProgram: IProgram = {
      id: action.name,
      name: action.name,
      url: "",
      author: "",
      description: action.name,
      nextDay: 1,
      days: [{ name: "Day 1", exercises: [] }],
      exercises: [],
      tags: [],
    };
    let newState = lf(state)
      .p("storage")
      .p("programs")
      .modify((programs) => [...programs, newProgram]);
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
  } else if (action.type === "ApplyProgramChangesToProgress") {
    const progress = state.progress[0];
    if (progress != null) {
      const program = Program.getProgram(state, progress.programId)!;
      const programDay = program.days[progress.day - 1];
      const newProgress = Progress.applyProgramDay(progress, program, programDay, state.storage.settings);
      return {
        ...state,
        progress: { ...state.progress, 0: newProgress },
      };
    } else {
      return state;
    }
  } else {
    return state;
  }
};
