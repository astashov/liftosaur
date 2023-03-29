import { Reducer } from "preact/hooks";
import { Program } from "../models/program";
import { Progress } from "../models/progress";
import { StateError } from "./stateError";
import { History } from "../models/history";
import { Storage } from "../models/storage";
import { Screen, IScreen } from "../models/screen";
import deepmerge from "deepmerge";
import { CollectionUtils } from "../utils/collection";
import { ILensRecordingPayload, lf } from "lens-shmens";
import RB from "rollbar";
import { getLatestMigrationVersion } from "../migrations/migrations";
import { ILocalStorage, INotification, IState } from "../models/state";
import { UidFactory } from "../utils/generator";
import {
  THistoryRecord,
  IStorage,
  IExerciseType,
  IWeight,
  IProgressMode,
  ISettings,
  IHistoryRecord,
  IProgram,
  IProgramExercise,
} from "../types";
import { IndexedDBUtils } from "../utils/indexeddb";
import { Equipment } from "../models/equipment";
import { basicBeginnerProgram } from "../programs/basicBeginnerProgram";
import { LogUtils } from "../utils/log";
import { Exercise } from "../models/exercise";
import { ProgramExercise } from "../models/programExercise";
import { IProgramState } from "../types";

declare let Rollbar: RB;
const isLoggingEnabled =
  typeof window !== "undefined" && window?.location ? !!new URL(window.location.href).searchParams.get("log") : false;
const shouldSkipIntro =
  typeof window !== "undefined" && window?.location
    ? !!new URL(window.location.href).searchParams.get("skipintro")
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
  const url = args?.url || new URL(document.location.href);
  const userId = url.searchParams.get("userid") || undefined;
  const messageerror = url.searchParams.get("messageerror") || undefined;
  const messagesuccess = url.searchParams.get("messagesuccess") || undefined;
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
    const finalStorage = await Storage.getWithDefault(client, storage.storage, true);
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
      progress: isProgressValid ? { 0: storage.progress } : {},
      allFriends: { friends: {}, sortedIds: [], isLoading: false },
      friendsHistory: {},
      likes: { likes: {}, isLoading: false },
      notification,
      loading: { items: {} },
      programs: [basicBeginnerProgram],
      currentHistoryRecord: 0,
      comments: { comments: {}, isLoading: false, isPosting: false, isRemoving: {} },
      screenStack,
      user: userId ? { email: userId, id: userId } : undefined,
    };
  }
  const newState: IState = {
    screenStack: [shouldSkipIntro ? "programs" : "first"],
    progress: {},
    programs: [basicBeginnerProgram],
    loading: { items: {} },
    allFriends: { friends: {}, sortedIds: [], isLoading: false },
    likes: { likes: {}, isLoading: false },
    friendsHistory: {},
    notification,
    comments: { comments: {}, isLoading: false, isPosting: false, isRemoving: {} },
    storage: Storage.getDefault(),
    user: userId ? { email: userId, id: userId } : undefined,
  };
  LogUtils.log(newState.storage.tempUserId, "ls-initialize-user", {}, [], () => undefined);
  return newState;
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
  programExercise?: IProgramExercise;
  allProgramExercises?: IProgramExercise[];
  setIndex: number;
  weight: IWeight;
  mode: IProgressMode;
};

export type IConfirmUserPromptedStateVarsAction = {
  type: "ConfirmUserPromptedStateVars";
  programExerciseId: string;
  userPromptedStateVars: IProgramState;
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

export type IStoreWebpushrSidAction = {
  type: "StoreWebpushrSidAction";
  sid: number;
};

export type IEditHistoryRecordAction = {
  type: "EditHistoryRecord";
  userId?: string;
  historyRecord: IHistoryRecord;
};

export type IStartTimer = {
  type: "StartTimer";
  timestamp: number;
  timer: number;
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

export type ICardsAction =
  | IChangeRepsAction
  | IChangeWeightAction
  | IChangeAMRAPAction
  | IConfirmWeightAction
  | IConfirmUserPromptedStateVarsAction;

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
  | IReplaceStateAction
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
  if (timerId != null) {
    window.clearTimeout(timerId);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).state = newState;
  timerId = window.setTimeout(async () => {
    clearTimeout(timerId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newState2: IState = (window as any).state;
    timerId = undefined;
    const userId = newState2.user?.id || newState.storage.tempUserId;
    const localStorage: ILocalStorage = {
      storage: newState2.storage,
      progress: newState2.progress[0],
    };
    try {
      await IndexedDBUtils.set("current_account", userId);
      await IndexedDBUtils.set(`liftosaur_${userId}`, JSON.stringify(localStorage));
    } catch (e) {
      console.error(e);
    }
  }, 100);
  return newState;
};

export function buildCardsReducer(settings: ISettings): Reducer<IHistoryRecord, ICardsAction> {
  return (progress, action): IHistoryRecord => {
    switch (action.type) {
      case "ChangeRepsAction": {
        let newProgress = Progress.updateRepsInExercise(
          progress,
          action.exercise,
          action.weight,
          action.setIndex,
          action.mode
        );
        const oldEntry = progress.entries.filter((e) => Exercise.eq(e.exercise, action.exercise))[0];
        const entry = newProgress.entries.filter((e) => Exercise.eq(e.exercise, action.exercise))[0];
        if (
          entry != null &&
          !Progress.isFinishedSet(oldEntry) &&
          Progress.isFinishedSet(entry) &&
          action.programExercise &&
          action.allProgramExercises &&
          ProgramExercise.hasUserPromptedVars(action.programExercise, action.allProgramExercises)
        ) {
          newProgress.ui = {
            ...(progress.ui || {}),
            stateVarsUserPromptModal: {
              programExercise: action.programExercise,
            },
          };
        }
        if (Progress.isFullyFinishedSet(newProgress)) {
          newProgress = Progress.stopTimer(newProgress);
        }
        return newProgress;
      }
      case "ChangeAMRAPAction": {
        progress = Progress.updateAmrapRepsInExercise(progress, action.value);
        if (Progress.isFullyFinishedSet(progress)) {
          progress = Progress.stopTimer(progress);
        }
        return progress;
      }
      case "ChangeWeightAction": {
        return Progress.showUpdateWeightModal(progress, action.exercise, action.weight, action.programExercise);
      }
      case "ConfirmWeightAction": {
        return Progress.updateWeight(progress, settings, action.weight, action.programExercise);
      }
      case "ConfirmUserPromptedStateVars": {
        return Progress.updateUserPromptedStateVars(progress, action.programExerciseId, action.userPromptedStateVars);
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
        currentHistoryRecordUserId: undefined,
        screenStack:
          Screen.current(state.screenStack) !== "progress"
            ? Screen.push(state.screenStack, "progress")
            : state.screenStack,
      };
    } else if (state.storage.currentProgramId != null) {
      // TODO: What if the program is missing?
      const program = state.storage.programs.find((p) => p.id === state.storage.currentProgramId)!;
      const newProgress = Program.nextProgramRecord(program, state.storage.settings);
      return {
        ...state,
        currentHistoryRecord: 0,
        currentHistoryRecordUserId: undefined,
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
      currentHistoryRecordUserId: action.userId,
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
  } else if (action.type === "StartTimer") {
    return Progress.setProgress(
      state,
      Progress.startTimer(
        Progress.getProgress(state)!,
        action.timestamp,
        action.mode,
        action.timer,
        state.storage.settings,
        state.storage.subscription
      )
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
  } else if (action.type === "SyncStorage") {
    const oldStorage = state.storage;
    const newStorage = action.storage;
    if (newStorage?.id != null && oldStorage?.id != null && newStorage.id > oldStorage.id) {
      const storage: IStorage = {
        id: newStorage.id,
        email: newStorage.email,
        reviewRequests: newStorage.reviewRequests,
        signupRequests: newStorage.signupRequests,
        affiliates: newStorage.affiliates,
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
          equipment: Equipment.mergeEquipment(oldStorage.settings.equipment, newStorage.settings.equipment),
          graphsSettings: newStorage.settings.graphsSettings,
          exerciseStatsSettings: newStorage.settings.exerciseStatsSettings,
          lengthUnits: newStorage.settings.lengthUnits,
          statsEnabled: newStorage.settings.statsEnabled,
          exercises: newStorage.settings.exercises,
          graphs: newStorage.settings.graphs || [],
          timers: deepmerge(oldStorage.settings.timers, newStorage.settings.timers),
          units: newStorage.settings.units,
          isPublicProfile: newStorage.settings.isPublicProfile,
          shouldShowFriendsHistory: newStorage.settings.shouldShowFriendsHistory,
          nickname: newStorage.settings.nickname,
        },
        subscription: {
          apple: { ...oldStorage.subscription.apple, ...newStorage.subscription.apple },
          google: { ...oldStorage.subscription.google, ...newStorage.subscription.google },
        },
        tempUserId: newStorage.tempUserId || UidFactory.generateUid(10),
        currentProgramId: newStorage.currentProgramId,
        history: CollectionUtils.concatBy(oldStorage.history, newStorage.history, (el) => el.date!),
        version: newStorage.version,
        programs: newStorage.programs,
        helps: newStorage.helps,
        whatsNew: newStorage.whatsNew,
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
      shortDescription: "",
      description: "",
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
