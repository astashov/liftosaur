/* eslint-disable @typescript-eslint/no-explicit-any */
import { Reducer } from "preact/hooks";
import { emptyProgramId, Program } from "../models/program";
import { Progress } from "../models/progress";
import { StateError } from "./stateError";
import { History } from "../models/history";
import { Storage } from "../models/storage";
import { Screen, IScreen, IScreenStack, IScreenParams } from "../models/screen";
import { ILensRecordingPayload, lf } from "lens-shmens";
import { buildState, IEnv, ILocalStorage, INotification, IState, IStateErrors } from "../models/state";
import { UidFactory } from "../utils/generator";
import {
  THistoryRecord,
  IStorage,
  IWeight,
  IProgressMode,
  ISettings,
  IHistoryRecord,
  IPercentage,
  IProgramState,
  ISubscription,
} from "../types";
import { IndexedDBUtils } from "../utils/indexeddb";
import { basicBeginnerProgram } from "../programs/basicBeginnerProgram";
import { LogUtils } from "../utils/log";
import { ProgramExercise } from "../models/programExercise";
import { Service } from "../api/service";
import { unrunMigrations } from "../migrations/runner";
import { ObjectUtils } from "../utils/object";
import { UrlUtils } from "../utils/url";
import { DateUtils } from "../utils/date";
import { IReducerOnAction } from "./types";
import { Thunk } from "./thunks";
import { CollectionUtils } from "../utils/collection";
import { Subscriptions } from "../utils/subscriptions";
import deepmerge from "deepmerge";
import { Exercise } from "../models/exercise";
import { SendMessage } from "../utils/sendMessage";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { IByExercise } from "../pages/planner/plannerEvaluator";

const isLoggingEnabled =
  typeof window !== "undefined" && window?.location
    ? !!UrlUtils.build(window.location.href).searchParams.get("log")
    : false;
const shouldSkipIntro =
  typeof window !== "undefined" && window?.location
    ? !!UrlUtils.build(window.location.href).searchParams.get("skipintro")
    : false;

export async function getIdbKey(userId?: string, isAdmin?: boolean): Promise<string> {
  const currentAccount = await IndexedDBUtils.get("current_account");
  if (currentAccount) {
    return `liftosaur_${currentAccount}`;
  } else {
    return userId != null && isAdmin ? `liftosaur_${userId}` : "liftosaur";
  }
}

export async function getInitialState(
  client: Window["fetch"],
  args?: { url?: URL; rawStorage?: string; storage?: IStorage }
): Promise<IState> {
  const url = args?.url || UrlUtils.build(document.location.href);
  const messageerror = url.searchParams.get("messageerror") || undefined;
  const messagesuccess = url.searchParams.get("messagesuccess") || undefined;
  const nosync = url.searchParams.get("nosync") === "true";
  let storage: ILocalStorage | undefined;
  if (args?.storage) {
    storage = { storage: args.storage };
  } else if (args?.rawStorage != null) {
    try {
      storage = JSON.parse(args.rawStorage);
    } catch (e) {
      storage = undefined;
    }
  }
  const notification: INotification | undefined =
    messageerror || messagesuccess
      ? {
          type: messageerror ? ("error" as const) : ("success" as const),
          content: messageerror || messagesuccess || "",
        }
      : undefined;

  if (storage != null && storage.storage != null) {
    const hasUnrunMigrations = unrunMigrations(storage.storage).length > 0;
    const maybeStorage = await Storage.get(client, storage.storage, true);
    let finalStorage: IStorage;
    const errors: IStateErrors = {};
    if (maybeStorage.success) {
      finalStorage = maybeStorage.data;
    } else {
      const service = new Service(client);
      const userid = (storage.storage?.tempUserId || `missing-${UidFactory.generateUid(8)}`) as string;
      const serverStorage = await service.getStorage(userid, undefined, undefined);
      const maybeServerStorage = await Storage.get(client, serverStorage.storage, false);
      if (maybeServerStorage.success) {
        finalStorage = maybeServerStorage.data;
      } else {
        errors.corruptedstorage = {
          userid,
          backup: await service.postDebug(userid, JSON.stringify(storage.storage), { local: "true" }),
          confirmed: false,
          local: true,
        };
        finalStorage = Storage.getDefault();
      }
    }

    const finalLastSyncedStorage: IStorage | undefined = storage.lastSyncedStorage;

    const isProgressValid =
      storage.progress != null
        ? Storage.validateAndReport(storage.progress, THistoryRecord, "progress").success
        : false;

    const screenStack: IScreenStack = finalStorage.currentProgramId
      ? [{ name: "main" }]
      : shouldSkipIntro
        ? [{ name: "programs" }]
        : [{ name: "first" }];
    return {
      storage: finalStorage,
      lastSyncedStorage: finalLastSyncedStorage,
      progress: isProgressValid ? { 0: storage.progress } : {},
      notification,
      loading: { items: {} },
      programs: [basicBeginnerProgram],
      revisions: {},
      screenStack,
      user: undefined,
      freshMigrations: maybeStorage.success && hasUnrunMigrations,
      errors,
      nosync,
    };
  }
  const newState = buildState({
    notification,
    shouldSkipIntro,
    nosync,
  });
  LogUtils.log(newState.storage.tempUserId, "ls-initialize-user", {}, [], () => undefined);
  return newState;
}

export type IChangeDate = {
  type: "ChangeDate";
  date: string;
  time: number;
};

export type IConfirmDate = {
  type: "ConfirmDate";
  date?: string;
  time?: number;
};

export type ILoginAction = {
  type: "Login";
  email: string;
  userId: string;
};

export type ILogoutAction = {
  type: "Logout";
};

export type IPushScreen<T extends IScreen> = {
  type: "PushScreen";
  screen: T;
  params?: IScreenParams<T>;
  shouldResetStack?: boolean;
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

export type ICompleteSetAction = {
  type: "CompleteSetAction";
  entryIndex: number;
  setIndex: number;
  programExercise?: IPlannerProgramExercise;
  otherStates?: IByExercise<IProgramState>;
  mode: IProgressMode;
};

export type IFinishProgramDayAction = {
  type: "FinishProgramDayAction";
};

export type IStartProgramDayAction = {
  type: "StartProgramDayAction";
  programId?: string;
};

export type IChangeAMRAPAction = {
  type: "ChangeAMRAPAction";
  setIndex: number;
  entryIndex: number;
  amrapValue?: number;
  rpeValue?: number;
  weightValue?: IWeight;
  isAmrap?: boolean;
  logRpe?: boolean;
  askWeight?: boolean;
  programExercise?: IPlannerProgramExercise;
  otherStates?: IByExercise<IProgramState>;
  userVars?: Record<string, number | IWeight | IPercentage>;
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

export type IReplaceStateAction = {
  type: "ReplaceState";
  state: IState;
};

export type IEditHistoryRecordAction = {
  type: "EditHistoryRecord";
  historyRecord: IHistoryRecord;
};

export type IStartTimer = {
  type: "StartTimer";
  timestamp: number;
  mode: IProgressMode;
  entryIndex: number;
  setIndex: number;
  timer?: number;
};

export type IStopTimer = {
  type: "StopTimer";
};

export type IApplyProgramChangesToProgress = {
  type: "ApplyProgramChangesToProgress";
  programExerciseIds?: string[];
  checkReused?: boolean;
};

export type IUpdateProgressAction = {
  type: "UpdateProgress";
  lensRecordings: ILensRecordingPayload<IHistoryRecord>[];
  desc?: string;
};

export type ICardsAction = ICompleteSetAction | IChangeAMRAPAction | IUpdateProgressAction;

export type IAction =
  | ICardsAction
  | IStartProgramDayAction
  | IFinishProgramDayAction
  | IEditHistoryRecordAction
  | ICancelProgress
  | IDeleteProgress
  | IPushScreen<any>
  | IPullScreen
  | IChangeDate
  | IConfirmDate
  | ILoginAction
  | ILogoutAction
  | IStartTimer
  | IStopTimer
  | IUpdateStateAction
  | IReplaceStateAction
  | IUpdateSettingsAction
  | IApplyProgramChangesToProgress;

let timerId: number | undefined = undefined;

export function defaultOnActions(env: IEnv): IReducerOnAction[] {
  return [
    (dispatch, action, oldState, newState) => {
      if (Storage.isChanged(oldState.storage, newState.storage)) {
        dispatch(Thunk.sync2());
      }
    },
    (dispatch, action, oldState, newState) => {
      const progress = newState.progress[0];
      if (progress != null) {
        const oldProgram = Program.getProgram(oldState, progress.programId);
        const newProgram = Program.getProgram(newState, progress.programId);
        if (oldProgram != null && newProgram != null && !ObjectUtils.isEqual(oldProgram, newProgram)) {
          dispatch({ type: "ApplyProgramChangesToProgress" });
        }
      }
    },
    (dispatch, action, oldState, newState) => {
      const progress = newState.progress[0];
      if (progress != null) {
        const oldExerciseData = oldState.storage.settings.exerciseData;
        const newExerciseData = newState.storage.settings.exerciseData;
        if (
          oldExerciseData != null &&
          newExerciseData != null &&
          !ObjectUtils.isEqual(oldExerciseData, newExerciseData)
        ) {
          const changes = ObjectUtils.changedKeys(oldExerciseData, newExerciseData);
          if (ObjectUtils.isNotEmpty(changes)) {
            const changedExercises = ObjectUtils.keys(changes);
            const affectedEntries = progress.entries.filter((entry) => {
              const key = Exercise.toKey(entry.exercise);
              return changedExercises.indexOf(key) !== -1;
            });
            if (affectedEntries.length > 0) {
              dispatch({
                type: "ApplyProgramChangesToProgress",
                programExerciseIds: CollectionUtils.compact(affectedEntries.map((e) => e.programExerciseId)),
                checkReused: false,
              });
            }
          }
        }
      }
    },
    (dispatch, action, oldState, newState) => {
      if (oldState.screenStack !== newState.screenStack) {
        setTimeout(() => {
          window.scroll(0, 0);
        }, 0);
      }
    },
    (dispatch, action, oldState, newState) => {
      if (!ObjectUtils.isEqual(oldState.storage.subscription.apple, newState.storage.subscription.apple)) {
        const userId = newState.user?.id || newState.storage.tempUserId;
        Subscriptions.cleanupOutdatedAppleReceipts(dispatch, userId, env.service, newState.storage.subscription);
      }
    },
    (dispatch, action, oldState, newState) => {
      if (oldState.storage.subscription.google !== newState.storage.subscription.google) {
        const userId = newState.user?.id || newState.storage.tempUserId;
        Subscriptions.cleanupOutdatedGooglePurchaseTokens(dispatch, userId, env.service, newState.storage.subscription);
      }
    },
    (dispatch, action, oldState, newState) => {
      if ("type" in action && action.type === "UpdateState" && action.desc === "stop-is-undoing") {
        setTimeout(() => {
          window.isUndoing = false;
        }, 200);
      }
    },
  ];
}

export const reducerWrapper =
  (storeToLocalStorage: boolean): Reducer<IState, IAction> =>
  (state, action) => {
    if (typeof window !== "undefined") {
      window.reducerLastState = state;
      window.reducerLastActions = [
        { ...action, time: DateUtils.formatHHMMSS(Date.now(), true) },
        ...(window.reducerLastActions || []).slice(0, 30),
      ];
    }
    const newState = reducer(state, action);
    if (!newState.reportedCorruptedStorage && newState.storage !== state.storage) {
      const validateResult = Storage.validateAndReportStorage(newState.storage);
      if (!validateResult.success) {
        newState.reportedCorruptedStorage = true;
      }
    }

    if (typeof window !== "undefined" && window.setTimeout && window.clearTimeout) {
      window.tempUserId = newState.storage.tempUserId;
      if (timerId != null) {
        window.clearTimeout(timerId);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).state = newState;
      if (storeToLocalStorage && newState.errors.corruptedstorage == null) {
        timerId = window.setTimeout(async () => {
          clearTimeout(timerId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newState2: IState = (window as any).state;
          timerId = undefined;
          const userId = newState2.user?.id || newState2.storage.tempUserId;
          const localStorage: ILocalStorage = {
            storage: newState2.storage,
            lastSyncedStorage: newState2.lastSyncedStorage,
            progress: newState2.progress[0],
          };
          try {
            await IndexedDBUtils.set("current_account", userId);
            await IndexedDBUtils.set(`liftosaur_${userId}`, JSON.stringify(localStorage));
          } catch (e) {
            console.error(e);
          }
        }, 100);
      }
    }
    return newState;
  };

export function buildCardsReducer(
  settings: ISettings,
  subscription?: ISubscription
): Reducer<IHistoryRecord, ICardsAction> {
  return (progress, action): IHistoryRecord => {
    switch (action.type) {
      case "CompleteSetAction": {
        const hasUserPromptedVars =
          action.programExercise && ProgramExercise.hasUserPromptedVars(action.programExercise);
        let newProgress = Progress.completeSet(
          progress,
          action.entryIndex,
          action.setIndex,
          action.mode,
          !!hasUserPromptedVars
        );
        if (action.programExercise && !newProgress.ui?.amrapModal) {
          newProgress = Progress.runUpdateScript(
            newProgress,
            action.programExercise,
            action.otherStates || {},
            action.entryIndex,
            action.setIndex,
            action.mode,
            settings
          );
        }

        if (Progress.isFullyFinishedSet(newProgress)) {
          newProgress = Progress.stopTimer(newProgress);
        }
        newProgress.intervals = History.resumeWorkout(newProgress.intervals, settings.timers.reminder);
        newProgress = Progress.startTimer(
          newProgress,
          new Date().getTime(),
          action.mode,
          action.entryIndex,
          action.setIndex,
          settings,
          subscription
        );
        return newProgress;
      }
      case "ChangeAMRAPAction": {
        let newProgress = { ...progress };
        if (
          action.amrapValue == null &&
          action.rpeValue == null &&
          action.weightValue == null &&
          ObjectUtils.keys(action.userVars || {}).length === 0
        ) {
          return { ...newProgress, ui: { ...newProgress.ui, amrapModal: undefined } };
        }
        if (action.amrapValue != null) {
          newProgress = Progress.updateAmrapRepsInExercise(newProgress, action.amrapValue);
        }
        if (action.logRpe) {
          newProgress = Progress.updateRpeInExercise(newProgress, action.rpeValue);
        }
        if (action.weightValue != null) {
          newProgress = Progress.updateWeightInExercise(newProgress, action.weightValue);
        }
        const programExerciseId = action.programExercise?.key;
        if (ObjectUtils.keys(action.userVars || {}).length > 0 && programExerciseId != null) {
          newProgress = Progress.updateUserPromptedStateVars(newProgress, programExerciseId, action.userVars || {});
        }
        newProgress = Progress.completeAmrapSet(newProgress, action.entryIndex, action.setIndex);
        if (action.programExercise) {
          newProgress = Progress.runUpdateScript(
            newProgress,
            action.programExercise,
            action.otherStates || {},
            action.entryIndex,
            action.setIndex,
            "workout",
            settings
          );
        }
        if (Progress.isFullyFinishedSet(newProgress)) {
          newProgress = Progress.stopTimer(newProgress);
        }
        newProgress.intervals = History.resumeWorkout(newProgress.intervals, settings.timers.reminder);
        newProgress = Progress.startTimer(
          newProgress,
          new Date().getTime(),
          "workout",
          action.entryIndex,
          action.setIndex,
          settings,
          subscription
        );
        return { ...newProgress, ui: { ...newProgress.ui, amrapModal: undefined } };
      }
      case "UpdateProgress": {
        return action.lensRecordings.reduce((memo, recording) => recording.fn(memo), progress);
      }
    }
  };
}

function pushScreen<T extends IScreen>(
  screenStack: IScreenStack,
  name: T,
  params?: IScreenParams<T>,
  shouldResetStack?: boolean
): IScreenStack {
  if (screenStack.length > 0) {
    const current = Screen.current(screenStack);
    if (current.name !== name || !ObjectUtils.isEqual(current.params || {}, params || {})) {
      if (shouldResetStack) {
        return [{ name, ...(params ? { params } : {}) } as Extract<IScreen, { name: string }>];
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Screen.push(screenStack, name, params as any);
      }
    }
  }
  return screenStack;
}

export const reducer: Reducer<IState, IAction> = (state, action): IState => {
  if (action.type === "CompleteSetAction") {
    return Progress.setProgress(
      state,
      buildCardsReducer(state.storage.settings, state.storage.subscription)(Progress.getProgress(state)!, action)
    );
  } else if (action.type === "ChangeAMRAPAction") {
    return Progress.setProgress(
      state,
      buildCardsReducer(state.storage.settings, state.storage.subscription)(Progress.getProgress(state)!, action)
    );
  } else if (action.type === "UpdateProgress") {
    return Progress.setProgress(
      state,
      buildCardsReducer(state.storage.settings, state.storage.subscription)(Progress.getProgress(state)!, action)
    );
  } else if (action.type === "StartProgramDayAction") {
    const progress = state.progress[0];
    if (progress != null) {
      return {
        ...state,
        screenStack: pushScreen(state.screenStack, "progress", { id: progress.id }, true),
      };
    } else if (state.storage.currentProgramId != null) {
      const program = Program.getProgram(state, action.programId || state.storage.currentProgramId);
      if (program != null) {
        const newProgress = Program.nextHistoryRecord(program, state.storage.settings);
        return {
          ...state,
          screenStack: pushScreen(state.screenStack, "progress", { id: 0 }, true),
          progress: { ...state.progress, 0: newProgress },
        };
      } else {
        alert("No currently selected program");
        return state;
      }
    } else {
      return state;
    }
  } else if (action.type === "EditHistoryRecord") {
    let newScreenStack = state.screenStack;
    if (Screen.currentName(state.screenStack) === "main") {
      newScreenStack = Screen.updateParams<"main">(state.screenStack, { historyRecordId: action.historyRecord.id });
    }
    return {
      ...state,
      screenStack: pushScreen(newScreenStack, "progress", { id: action.historyRecord.id }),
      progress: { ...state.progress, [action.historyRecord.id]: action.historyRecord },
    };
  } else if (action.type === "FinishProgramDayAction") {
    const settings = state.storage.settings;
    const progress = Progress.getProgress(state);
    if (progress == null) {
      throw new StateError("FinishProgramDayAction: no progress");
    } else {
      const programIndex = state.storage.programs.findIndex((p) => p.id === progress.programId)!;
      const program =
        progress.programId === emptyProgramId ? Program.createEmptyProgram() : state.storage.programs[programIndex];
      const evaluatedProgram = Program.evaluate(program, settings);
      Progress.stopTimer(progress);
      const historyRecord = History.finishProgramDay(progress, state.storage.settings, progress.day, evaluatedProgram);
      let newHistory;
      if (!Progress.isCurrent(progress)) {
        newHistory = state.storage.history.map((h) => (h.id === progress.id ? historyRecord : h));
      } else {
        newHistory = [historyRecord, ...state.storage.history];
      }
      const exerciseData = state.storage.settings.exerciseData;
      const { program: newProgram, exerciseData: newExerciseData } =
        Progress.isCurrent(progress) && program != null
          ? Program.runAllFinishDayScripts(program, progress, settings)
          : { program, exerciseData };
      const newPrograms =
        newProgram != null ? lf(state.storage.programs).i(programIndex).set(newProgram) : state.storage.programs;
      const newSettingsExerciseData = deepmerge(state.storage.settings.exerciseData, newExerciseData);
      return {
        ...state,
        storage: {
          ...state.storage,
          history: newHistory,
          programs: newPrograms,
          settings: {
            ...state.storage.settings,
            exerciseData: newSettingsExerciseData,
          },
        },
        screenStack: Progress.isCurrent(progress) ? [{ name: "finishDay" }] : Screen.pull(state.screenStack),
        progress: Progress.stop(state.progress, progress.id),
      };
    }
  } else if (action.type === "ChangeDate") {
    return Progress.setProgress(state, Progress.showUpdateDate(Progress.getProgress(state)!, action.date, action.time));
  } else if (action.type === "ConfirmDate") {
    return Progress.setProgress(state, Progress.changeDate(Progress.getProgress(state)!, action.date, action.time));
  } else if (action.type === "CancelProgress") {
    const progress = Progress.getProgress(state)!;
    return {
      ...state,
      screenStack: pushScreen(state.screenStack, "main", undefined, true),
      progress: Progress.isCurrent(progress)
        ? state.progress
        : Progress.stop(state.progress, Progress.getProgressId(state.screenStack)),
    };
  } else if (action.type === "DeleteProgress") {
    const progress = Progress.getProgress(state);
    if (progress != null) {
      const history = state.storage.history.filter((h) => h.id !== progress.id);
      if (Progress.isCurrent(progress)) {
        SendMessage.toIosAndAndroid({ type: "pauseWorkout" });
      }
      return {
        ...state,
        screenStack: pushScreen(state.screenStack, "main", undefined, true),
        storage: { ...state.storage, deletedHistory: [...state.storage.deletedHistory, progress.id], history },
        progress: Progress.stop(state.progress, progress.id),
      };
    } else {
      return state;
    }
  } else if (action.type === "PushScreen") {
    const newScreenStack = pushScreen(state.screenStack, action.screen, action.params, action.shouldResetStack);
    return newScreenStack === state.screenStack ? state : { ...state, screenStack: newScreenStack };
  } else if (action.type === "PullScreen") {
    return { ...state, screenStack: Screen.pull(state.screenStack) };
  } else if (action.type === "Login") {
    return {
      ...state,
      user: { email: action.email, id: action.userId },
      storage: { ...state.storage, email: action.email },
    };
  } else if (action.type === "Logout") {
    return { ...state, user: undefined, storage: { ...state.storage, email: undefined } };
  } else if (action.type === "StopTimer") {
    const progress = Progress.getProgress(state);
    if (progress != null) {
      return Progress.setProgress(state, Progress.stopTimer(progress));
    } else {
      return state;
    }
  } else if (action.type === "StartTimer") {
    const progress = Progress.getProgress(state);
    if (progress) {
      return Progress.setProgress(
        state,
        Progress.startTimer(
          progress,
          action.timestamp,
          action.mode,
          action.entryIndex,
          action.setIndex,
          state.storage.settings,
          state.storage.subscription,
          action.timer
        )
      );
    } else {
      return state;
    }
  } else if (action.type === "UpdateSettings") {
    return {
      ...state,
      storage: {
        ...state.storage,
        settings: action.lensRecording.fn(state.storage.settings),
      },
    };
  } else if (action.type === "ReplaceState") {
    return action.state;
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
  } else if (action.type === "ApplyProgramChangesToProgress") {
    const progress = state.progress[0];
    if (progress != null) {
      const program = Program.evaluate(Program.getProgram(state, progress.programId)!, state.storage.settings);
      let newProgress = Progress.applyProgramDay(
        progress,
        program,
        progress.day,
        state.storage.settings,
        action.programExerciseIds
      );
      newProgress = Progress.runInitialUpdateScripts(
        newProgress,
        action.programExerciseIds,
        progress.day,
        program,
        state.storage.settings
      );

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
