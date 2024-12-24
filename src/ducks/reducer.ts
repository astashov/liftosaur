import { Reducer } from "preact/hooks";
import { Program } from "../models/program";
import { Progress } from "../models/progress";
import { StateError } from "./stateError";
import { History } from "../models/history";
import { Storage } from "../models/storage";
import { Screen, IScreen } from "../models/screen";
import { ILensRecordingPayload, lf } from "lens-shmens";
import { buildState, IEnv, ILocalStorage, INotification, IState, IStateErrors } from "../models/state";
import { UidFactory } from "../utils/generator";
import {
  THistoryRecord,
  IStorage,
  IExerciseType,
  IWeight,
  IProgressMode,
  ISettings,
  IHistoryRecord,
  IProgramExercise,
  IPercentage,
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

    const screenStack: IScreen[] = finalStorage.currentProgramId
      ? ["main"]
      : shouldSkipIntro
      ? ["programs"]
      : ["first"];
    return {
      storage: finalStorage,
      lastSyncedStorage: finalLastSyncedStorage,
      progress: isProgressValid ? { 0: storage.progress } : {},
      notification,
      loading: { items: {} },
      programs: [basicBeginnerProgram],
      currentHistoryRecord: 0,
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
  entryIndex: number;
  setIndex: number;
  programExercise?: IProgramExercise;
  allProgramExercises?: IProgramExercise[];
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
  programExercise?: IProgramExercise;
  allProgramExercises?: IProgramExercise[];
  userVars?: Record<string, number | IWeight | IPercentage>;
};

export type IChangeWeightAction = {
  type: "ChangeWeightAction";
  weight: IWeight;
  exercise: IExerciseType;
  programExercise?: IProgramExercise;
};

export type IConfirmWeightAction = {
  type: "ConfirmWeightAction";
  weight?: IWeight;
  programExercise?: IProgramExercise;
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

export type ICreateProgramAction = {
  type: "CreateProgramAction";
  name: string;
};

export type ICreateDayAction = {
  type: "CreateDayAction";
  weekIndex?: number;
};

export type IEditDayAction = {
  type: "EditDayAction";
  index: number;
};

export type IApplyProgramChangesToProgress = {
  type: "ApplyProgramChangesToProgress";
  programExerciseIds?: string[];
  checkReused?: boolean;
};

export type IUpdateProgressAction = {
  type: "UpdateProgress";
  lensRecordings: ILensRecordingPayload<IHistoryRecord>[];
};

export type ICardsAction =
  | IChangeRepsAction
  | IChangeWeightAction
  | IChangeAMRAPAction
  | IConfirmWeightAction
  | IUpdateProgressAction;

export type IAction =
  | ICardsAction
  | IStartProgramDayAction
  | IFinishProgramDayAction
  | IEditHistoryRecordAction
  | ICancelProgress
  | IDeleteProgress
  | IPushScreen
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
  | ICreateProgramAction
  | ICreateDayAction
  | IEditDayAction
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
          const programChanges = ObjectUtils.changedKeys(oldProgram, newProgram);
          if (ObjectUtils.keys(programChanges).length === 1 && programChanges.exercises === "update") {
            const changedExerciseIds = Array.from(
              new Set(CollectionUtils.diff(oldProgram.exercises, newProgram.exercises).map((e) => e.id))
            );
            const onlyState = changedExerciseIds.every((id) => {
              const oldExercise = oldProgram.exercises.find((e) => e.id === id);
              const newExercise = newProgram.exercises.find((e) => e.id === id);
              const exerciseChanges =
                oldExercise && newExercise ? ObjectUtils.changedKeys(oldExercise, newExercise) : {};
              return ObjectUtils.keys(exerciseChanges).length === 1 && exerciseChanges.state === "update";
            });
            dispatch({
              type: "ApplyProgramChangesToProgress",
              programExerciseIds: changedExerciseIds,
              checkReused: !onlyState,
            });
          } else {
            dispatch({ type: "ApplyProgramChangesToProgress" });
          }
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

export const reducerWrapper = (storeToLocalStorage: boolean): Reducer<IState, IAction> => (state, action) => {
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
        const userId = newState2.user?.id || newState.storage.tempUserId;
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

export function buildCardsReducer(settings: ISettings): Reducer<IHistoryRecord, ICardsAction> {
  return (progress, action): IHistoryRecord => {
    switch (action.type) {
      case "ChangeRepsAction": {
        const hasUserPromptedVars =
          action.programExercise &&
          action.allProgramExercises &&
          ProgramExercise.hasUserPromptedVars(action.programExercise, action.allProgramExercises);

        let newProgress = Progress.updateRepsInExercise(
          progress,
          action.entryIndex,
          action.setIndex,
          action.mode,
          !!hasUserPromptedVars
        );
        if (action.programExercise && action.allProgramExercises && !newProgress.ui?.amrapModal) {
          newProgress = Progress.runUpdateScript(
            newProgress,
            action.programExercise,
            action.allProgramExercises,
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
        return newProgress;
      }
      case "ChangeAMRAPAction": {
        progress = Progress.updateAmrapRepsInExercise(progress, action.amrapValue, action.isAmrap);
        if (action.logRpe) {
          progress = Progress.updateRpeInExercise(progress, action.rpeValue);
        }
        if (action.weightValue) {
          progress = Progress.updateWeightInExercise(progress, action.weightValue);
        }
        const programExerciseId = action.programExercise?.id;
        if (ObjectUtils.keys(action.userVars || {}).length > 0 && programExerciseId != null) {
          progress = Progress.updateUserPromptedStateVars(progress, programExerciseId, action.userVars || {});
        }
        if (action.programExercise && action.allProgramExercises) {
          progress = Progress.runUpdateScript(
            progress,
            action.programExercise,
            action.allProgramExercises,
            action.entryIndex,
            action.setIndex,
            "workout",
            settings
          );
        }
        if (Progress.isFullyFinishedSet(progress)) {
          progress = Progress.stopTimer(progress);
        }
        progress.intervals = History.resumeWorkout(progress.intervals, settings.timers.reminder);
        return { ...progress, ui: { ...progress.ui, amrapModal: undefined } };
      }
      case "ChangeWeightAction": {
        return Progress.showUpdateWeightModal(progress, action.exercise, action.weight, action.programExercise);
      }
      case "ConfirmWeightAction": {
        return Progress.updateWeight(progress, settings, action.weight, action.programExercise);
      }
      case "UpdateProgress": {
        return action.lensRecordings.reduce((memo, recording) => recording.fn(memo), progress);
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
  } else if (action.type === "UpdateProgress") {
    return Progress.setProgress(state, buildCardsReducer(state.storage.settings)(Progress.getProgress(state)!, action));
  } else if (action.type === "StartProgramDayAction") {
    const progress = state.progress[0];
    if (progress != null) {
      return {
        ...state,
        currentHistoryRecord: progress.id,
        screenStack:
          Screen.current(state.screenStack) !== "progress"
            ? Screen.push(state.screenStack, "progress")
            : state.screenStack,
      };
    } else if (state.storage.currentProgramId != null) {
      const program = Program.getProgram(state, action.programId || state.storage.currentProgramId);
      if (program != null) {
        const newProgress = Program.nextProgramRecord(program, state.storage.settings);
        return {
          ...state,
          currentHistoryRecord: 0,
          screenStack: Screen.push(state.screenStack, "progress"),
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
      const programIndex = state.storage.programs.findIndex((p) => p.id === progress.programId)!;
      const program = state.storage.programs[programIndex];
      Progress.stopTimer(progress);
      const historyRecord = History.finishProgramDay(progress, state.storage.settings, program);
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
        screenStack: Progress.isCurrent(progress) ? ["finishDay"] : Screen.pull(state.screenStack),
        currentHistoryRecord: undefined,
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
      if (Progress.isCurrent(progress)) {
        SendMessage.toIosAndAndroid({ type: "pauseWorkout" });
      }
      return {
        ...state,
        currentHistoryRecord: undefined,
        screenStack: Screen.pull(state.screenStack),
        storage: { ...state.storage, deletedHistory: [...state.storage.deletedHistory, progress.startTime], history },
        progress: Progress.stop(state.progress, progress.id),
      };
    } else {
      return state;
    }
  } else if (action.type === "PushScreen") {
    if (state.screenStack.length > 0) {
      const screen = action.screen;
      if (state.screenStack[state.screenStack.length - 1] !== screen) {
        return { ...state, screenStack: Screen.push(state.screenStack, screen) };
      }
    }
    return state;
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
    let program = progress ? Program.getProgram(state, progress.programId) : undefined;
    if (progress && program) {
      program = Program.fullProgram(program, state.storage.settings);
      return Progress.setProgress(
        state,
        Progress.startTimer(
          progress,
          program,
          action.timestamp,
          action.mode,
          action.entryIndex,
          action.setIndex,
          state.storage.subscription,
          state.storage.settings,
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
  } else if (action.type === "CreateProgramAction") {
    const newProgram = Program.create(action.name);
    let newState = lf(state)
      .p("storage")
      .p("programs")
      .modify((programs) => [...programs, newProgram]);
    newState = lf(newState).p("editProgram").set({ id: newProgram.id });
    newState = lf(newState).p("storage").p("currentProgramId").set(newProgram.id);
    return lf(newState).p("screenStack").set(Screen.push(state.screenStack, "editProgram"));
  } else if (action.type === "CreateDayAction") {
    const program = Program.getEditingProgram(state)!;
    const programIndex = Program.getEditingProgramIndex(state)!;
    const days = program.days;
    const dayName = `Day ${days.length + 1}`;
    const day = Program.createDay(dayName);
    let newProgram = lf(program)
      .p("days")
      .modify((d) => [...d, day]);
    if (action.weekIndex != null && newProgram.weeks[action.weekIndex] != null) {
      newProgram = lf(newProgram)
        .p("weeks")
        .i(action.weekIndex)
        .p("days")
        .modify((d) => [...d, { id: day.id }]);
    }

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
      const program = Program.fullProgram(Program.getProgram(state, progress.programId)!, state.storage.settings);
      let newProgress = Progress.applyProgramDay(
        progress,
        program,
        progress.day,
        state.storage.settings,
        undefined,
        action.programExerciseIds,
        action.checkReused
      );
      newProgress = Progress.runInitialUpdateScripts(
        newProgress,
        action.programExerciseIds,
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
