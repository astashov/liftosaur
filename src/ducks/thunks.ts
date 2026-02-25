import { IThunk, IDispatch } from "./types";
import { IScreen, IScreenParams } from "../models/screen";
import RB from "rollbar";
import { IGetStorageResponse, IPostSyncResponse, Service } from "../api/service";
import { lb } from "lens-shmens";
import {
  Program_getProgram,
  Program_getFullProgram,
  Program_evaluate,
  Program_getProgramExercise,
  Program_isEmpty,
  Program_editAction,
  Program_nextHistoryRecord,
  Program_create,
  Program_exportProgramToFile,
  Program_exportProgramToLink,
} from "../models/program";
import { getGoogleAccessToken } from "../utils/googleAccessToken";
import { IEnv, IState, updateProgress, updateState } from "../models/state";
import { IProgram, IStorage, IExerciseType, ISettings, IDayData, IHistoryRecord } from "../types";
import {
  CollectionUtils_sortBy,
  CollectionUtils_uniqBy,
  CollectionUtils_compact,
  CollectionUtils_setAt,
} from "../utils/collection";
import { ImportExporter_exportStorage, ImportExporter_getExportedProgram } from "../lib/importexporter";
import { Storage_mergeStorage, Storage_isChanged, Storage_get, Storage_setAffiliate } from "../models/storage";
import { History_exportAsCSV } from "../models/history";
import { CSV_toString } from "../utils/csv";
import { Exporter_toFile } from "../utils/exporter";
import { DateUtils_formatYYYYMMDD, DateUtils_format } from "../utils/date";
import { getInitialState } from "./reducer";
import { IndexedDBUtils_get, IndexedDBUtils_remove } from "../utils/indexeddb";
import { WhatsNew_updateStorage } from "../models/whatsnew";
import { Screen_currentName, Screen_shouldConfirmNavigation, Screen_updateParams } from "../models/screen";
import {
  Subscriptions_listOfSubscriptions,
  Subscriptions_hasSubscription,
  Subscriptions_verifyAppleReceipt,
  Subscriptions_cleanupOutdatedAppleReceipts,
  Subscriptions_setAppleReceipt,
  Subscriptions_verifyGooglePurchaseToken,
  Subscriptions_setGooglePurchaseToken,
} from "../utils/subscriptions";
import {
  SendMessage_isIos,
  SendMessage_toIosWithResult,
  SendMessage_toIos,
  SendMessage_toAndroidWithResult,
  SendMessage_print,
  SendMessage_toAndroid,
  SendMessage_isAndroid,
} from "../utils/sendMessage";
import { UidFactory_generateUid } from "../utils/generator";
import { ClipboardUtils_copy } from "../utils/clipboard";
import {
  Progress_getProgress,
  Progress_updateTimer,
  Progress_getCurrentProgress,
  Progress_isCurrent,
  Progress_stop,
} from "../models/progress";
import { IImportLinkData, ImportFromLink_importFromLink } from "../utils/importFromLink";
import { getLatestMigrationVersion } from "../migrations/migrations";
import { LogUtils_log } from "../utils/log";
import { lg } from "../utils/posthog";
import { RollbarUtils_config } from "../utils/rollbar";
import { UrlUtils } from "../utils/url";
import { ImportFromLiftosaur } from "../utils/importFromLiftosaur";
import { Sync } from "../utils/sync";
import { ObjectUtils_values, ObjectUtils_filter, ObjectUtils_clone } from "../utils/object";
import { EditStats_uploadHealthStats } from "../models/editStats";
import { HealthSync } from "../lib/healthSync";
import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import { Weight_oppositeUnit } from "../models/weight";
import { EditProgram_initPlannerProgramExerciseState } from "../models/editProgram";
import { ICollectionVersions } from "../models/versionTracker";
import { DeviceId } from "../utils/deviceId";
import { LiveActivityManager } from "../utils/liveActivityManager";

declare let Rollbar: RB;

export class NoRetryError extends Error {
  public noretry = true;
}

export function Thunk_googleSignIn(cb?: () => void): IThunk {
  return async (dispatch, getState, env) => {
    const url = UrlUtils.build(window.location.href);
    const forcedUserEmail = url.searchParams.get("forceuseremail");
    if (forcedUserEmail == null) {
      const accessToken = await getGoogleAccessToken();
      if (accessToken != null) {
        const state = getState();
        const userId = state.user?.id || state.storage.tempUserId;
        const result = await load(dispatch, "Logging in", async () => {
          return env.service.googleSignIn(accessToken, userId, {});
        });
        await load(dispatch, "Signing in", () => {
          return handleLogin(dispatch, result, env.service.client, userId);
        });
        if (cb) {
          cb();
        }
        dispatch(Thunk_sync2());
      }
    } else {
      const state = getState();
      const userId = state.user?.id || state.storage.tempUserId;
      const result = await env.service.googleSignIn(forcedUserEmail, userId, { forcedUserEmail });
      await load(dispatch, "Logging in", () => handleLogin(dispatch, result, env.service.client, userId));
      if (cb) {
        cb();
      }
      dispatch(Thunk_sync2());
    }
  };
}

export function Thunk_postevent(action: string, extra?: Record<string, string | number>): IThunk {
  return async (dispatch, getState, env) => {
    lg(action, extra, env.service, getState().user?.id || getState().storage.tempUserId);
  };
}

export function Thunk_appleSignIn(cb?: () => void): IThunk {
  return async (dispatch, getState, env) => {
    dispatch(Thunk_postevent("apple-sign-in"));
    let id_token: string;
    let code: string;
    if (SendMessage_isIos()) {
      const result = await SendMessage_toIosWithResult<{ id_token: string; code: string } | { error: string }>({
        type: "signInWithApple",
      });
      if (!result) {
        return;
      }
      if ("error" in result) {
        alert(result.error);
        return;
      } else {
        ({ id_token, code } = result);
      }
    } else {
      if (!window.AppleID?.auth) {
        alert("Apple Sign In is not available");
        if (cb) {
          cb();
        }
        return;
      }
      const response = await window.AppleID.auth.signIn();
      ({ id_token, code } = response.authorization);
    }
    if (id_token != null && code != null) {
      const state = getState();
      const userId = state.user?.id || state.storage.tempUserId;
      const result = await load(dispatch, "Logging in", async () => env.service.appleSignIn(code, id_token, userId));
      await load(dispatch, "Signing in", () => handleLogin(dispatch, result, env.service.client, userId));
      if (cb) {
        cb();
      }
      dispatch(Thunk_sync2());
    } else {
      if (cb) {
        cb();
      }
    }
  };
}

export function Thunk_log(action: string): IThunk {
  return async (dispatch, getState, env) => {
    const state = getState();
    if (!state.nosync) {
      LogUtils_log(
        state.user?.id || state.storage.tempUserId,
        action,
        state.storage.affiliates,
        Subscriptions_listOfSubscriptions(state.storage.subscription),
        () => {
          updateState(
            dispatch,
            [lb<IState>().p("storage").p("subscription").p("key").record(undefined)],
            "Clear subscription key"
          );
        },
        state.storage.subscription.key,
        state.storage.referrer
      );
    }
  };
}

export function Thunk_logOut(cb?: () => void): IThunk {
  return async (dispatch, getState, env) => {
    dispatch(Thunk_postevent("log-out"));
    if (getState().user?.id) {
      await env.service.signout();
      dispatch({ type: "Logout" });
      updateState(dispatch, [lb<IState>().p("lastSyncedStorage").record(undefined)], "Clear last sync on logout");
      SendMessage_toIos({ type: "accountLogout" });
    }
    if (cb) {
      cb();
    }
  };
}

export function Thunk_postDebug(): IThunk {
  return async (dispatch, getState, env) => {
    const state = getState();
    const userid = state.user?.id || state.storage.tempUserId;
    await load(dispatch, "Debug sync", async () => env.service.postDebug(userid, JSON.stringify(state), {}));
  };
}

async function _sync2(
  dispatch: IDispatch,
  getState: () => IState,
  env: IEnv,
  args?: { force: boolean },
  signal?: AbortSignal
): Promise<void> {
  const state = getState();
  function handleResponse(
    result: IPostSyncResponse,
    handleResponseArgs: {
      lastSyncedStorage?: IStorage;
      requestedLastStorage?: boolean;
    }
  ): boolean {
    const { lastSyncedStorage, requestedLastStorage } = handleResponseArgs;
    if (result.type === "clean") {
      dispatch(Thunk_postevent("handle-response-clean"));
      updateState(
        dispatch,
        [
          lb<IState>()
            .p("lastSyncedStorage")
            .record(lastSyncedStorage || getState().lastSyncedStorage),
          lb<IState>().pi("lastSyncedStorage").p("originalId").record(result.new_original_id),
          lb<IState>().p("storage").p("originalId").record(result.new_original_id),
          lb<IState>().p("storage").p("subscription").p("key").record(result.key),
        ],
        "Update sync metadata"
      );
      if (getState().storage.email !== result.email || getState().user?.id !== result.user_id) {
        dispatch({ type: "Login", email: result.email, userId: result.user_id });
      }
      return true;
    } else if (result.type === "dirty") {
      result.storage.tempUserId = result.user_id;
      if (requestedLastStorage) {
        dispatch(Thunk_postevent("handle-response-dirty-requested-last-storage"));
        updateState(
          dispatch,
          [
            lb<IState>().p("lastSyncedStorage").record(result.storage),
            lb<IState>().p("storage").p("tempUserId").record(result.user_id),
          ],
          "Update last synced storage"
        );
      } else {
        dispatch(Thunk_postevent("handle-response-dirty"));
        const currentStorage = getState().storage;
        const currentHistoryLen = currentStorage.history?.length ?? 0;
        const serverHistoryLen = result.storage.history?.length ?? 0;
        const historyVersions = result.storage._versions?.history as { deleted?: Record<string, number> } | undefined;
        const serverDeletedHistory = Object.keys(historyVersions?.deleted || {}).length;

        const newStorage = Storage_mergeStorage(currentStorage, result.storage, getState().deviceId);
        const mergedHistoryLen = newStorage.history?.length ?? 0;

        if (currentHistoryLen > 0 && mergedHistoryLen < currentHistoryLen) {
          lg("ls-history-deletion-server-merge", {
            currentHistoryLen,
            serverHistoryLen,
            mergedHistoryLen,
            serverDeletedHistory,
          });
        }

        const newProgramIds = newStorage.programs.map((p) => p.id);
        if (Array.from(new Set(newProgramIds)).length !== newProgramIds.length) {
          lg("program-duplicate-ids-after-merge", {
            programIds: JSON.stringify(newProgramIds),
            oldPrograms: JSON.stringify(currentStorage.programs),
            newPrograms: JSON.stringify(result.storage.programs),
            oldVersions: JSON.stringify(currentStorage._versions?.programs),
            newVersions: JSON.stringify(result.storage._versions?.programs),
          });
        }
        updateState(
          dispatch,
          [
            lb<IState>().p("lastSyncedStorage").record(result.storage),
            lb<IState>().p("storage").record(newStorage),
            lb<IState>().p("storage").p("subscription").p("key").record(result.key),
          ],
          "Merge synced storage"
        );
        if (getState().storage.email !== result.email || getState().user?.id !== result.user_id) {
          dispatch({ type: "Login", email: result.email, userId: result.user_id });
        }
      }
      return true;
    } else if (result.type === "error" && result.error === "not_authorized") {
      updateState(
        dispatch,
        [
          lb<IState>().p("storage").p("subscription").p("key").record(result.key),
          lb<IState>().p("lastSyncedStorage").record(undefined),
        ],
        "Update subscription no storage"
      );
      return false;
    } else if (result.type === "error") {
      if (result.error === "outdated_client_storage") {
        if (typeof window !== "undefined") {
          alert(
            "The version of the storage on a device is older than on the server, so sync failed. " +
              "To fix it - kill/restart the app a couple times."
          );
        }
      }
      throw new NoRetryError(result.error);
    }
    return false;
  }
  if (state.lastSyncedStorage == null || state.lastSyncedStorage.tempUserId !== state.storage.tempUserId) {
    dispatch(
      Thunk_postevent("fetch-last-synced-storage", {
        lastUserId: state.lastSyncedStorage?.tempUserId ?? "",
        newUserId: state.storage.tempUserId ?? "",
      })
    );
    const result = await env.service.postSync({
      tempUserId: state.storage.tempUserId,
      storageUpdate: {
        version: state.storage.version,
      },
      signal,
      deviceId: state.deviceId,
    });
    if (signal?.aborted) {
      return;
    }
    const handled = handleResponse(result, { requestedLastStorage: true });
    if (handled) {
      await _sync2(dispatch, getState, env, args);
    }
  } else {
    dispatch(Thunk_postevent("sync-storage-update", { force: args?.force ? "true" : "false" }));
    const storageUpdate = Sync.getStorageUpdate2(state.storage, state.lastSyncedStorage, state.deviceId);
    if (args?.force || storageUpdate.storage) {
      const lastSyncedStorage = state.storage;
      const result = await env.service.postSync({
        tempUserId: state.storage.tempUserId,
        storageUpdate: storageUpdate,
        signal,
        deviceId: state.deviceId,
      });
      if (signal?.aborted) {
        return;
      }
      handleResponse(result, { lastSyncedStorage });
    }
  }
}

function getDeletedStats(state: IState): number[] {
  let deleted: string[] = [];
  const versionStats = state.storage._versions?.stats as Record<string, Record<string, ICollectionVersions>>;
  for (const type of Object.keys(versionStats || {})) {
    for (const statType of Object.keys(versionStats[type] || {})) {
      const stats = versionStats[type][statType];
      deleted = deleted.concat(Object.keys(stats.deleted || {}));
    }
  }
  return deleted.map(Number);
}

async function _syncHealthKit(dispatch: IDispatch, getState: () => IState, env: IEnv): Promise<void> {
  if (SendMessage_isIos()) {
    dispatch(Thunk_postevent("read-apple-health"));
    const anchor = getState().storage.settings.appleHealthAnchor;
    const result = await SendMessage_toIosWithResult({
      type: "getHealthKitData",
      weightunit: getState().storage.settings.units,
      lengthunit: getState().storage.settings.lengthUnits,
      anchor,
    });
    if (result != null) {
      EditStats_uploadHealthStats("ios", dispatch, result, getState().storage.settings, getDeletedStats(getState()));
    }
  } else {
    dispatch(Thunk_postevent("read-google-health"));
    const anchor = getState().storage.settings.googleHealthAnchor;
    const result = await SendMessage_toAndroidWithResult({
      type: "getHealthKitData",
      weightunit: getState().storage.settings.units,
      lengthunit: getState().storage.settings.lengthUnits,
      anchor,
    });
    if (result != null) {
      EditStats_uploadHealthStats(
        "android",
        dispatch,
        result,
        getState().storage.settings,
        getDeletedStats(getState())
      );
    }
  }
}

export function Thunk_syncHealthKit(cb?: () => void): IThunk {
  return async (dispatch, getState, env) => {
    const state = getState();
    if (
      !(state.storage.settings.appleHealthSyncMeasurements && HealthSync.eligibleForAppleHealth()) &&
      !(state.storage.settings.googleHealthSyncMeasurements && HealthSync.eligibleForGoogleHealth())
    ) {
      if (cb != null) {
        cb();
      }
      return;
    }
    try {
      await env.queue.enqueue(async () => {
        await _syncHealthKit(dispatch, getState, env);
      });
    } finally {
      if (cb != null) {
        cb();
      }
    }
  };
}

export function Thunk_sync2(args?: { force?: boolean; cb?: () => void; log?: boolean }): IThunk {
  return async (dispatch, getState, env) => {
    if (args?.log) {
      dispatch(
        Thunk_postevent("sync2-enter", {
          isProcessing: `${env.queue.getIsProcessing()}`,
          queueLength: env.queue.length().toString(),
        })
      );
    }
    try {
      const state = getState();
      if (state.errors.corruptedstorage == null && !state.nosync && (state.user != null || args?.force)) {
        await env.queue.enqueue(
          async (args2, signal) => {
            await load(dispatch, "Sync", async () => {
              if (args2?.log) {
                dispatch(Thunk_postevent("sync2-start"));
              }
              await _sync2(dispatch, getState, env, args2, signal);
            });
          },
          { force: !!args?.force, log: !!args?.log }
        );
      }
    } finally {
      if (args?.cb) {
        args.cb();
      }
    }
  };
}

export function Thunk_updateTimer(
  newTimer: number,
  entryIndex: number | undefined,
  setIndex: number | undefined,
  skipLiveActivityUpdate: boolean
): IThunk {
  return async (dispatch, getState, env) => {
    const state = getState();
    const progress = Progress_getProgress(state);
    if (!progress) {
      return;
    }
    const program = Program_getProgram(state, progress.programId);
    if (!program) {
      return;
    }
    const newProgress = Progress_updateTimer(
      progress,
      program,
      newTimer,
      progress.timerSince || Date.now(),
      entryIndex,
      setIndex,
      !!skipLiveActivityUpdate,
      state.storage.settings,
      state.storage.subscription
    );
    updateProgress(dispatch, lb<IHistoryRecord>().record(newProgress), "Update rest timer");
  };
}

export function Thunk_updateLiveActivity(
  entryIndex: number | undefined,
  setIndex: number | undefined,
  restTimer: number | undefined,
  restTimerSince: number | undefined
): IThunk {
  return async (dispatch, getState, env) => {
    const state = getState();
    const progress = Progress_getProgress(state);
    if (!progress) {
      return;
    }
    const program = Program_getProgram(state, progress.programId);
    if (!program) {
      return;
    }
    LiveActivityManager.updateProgressLiveActivity(
      program,
      progress,
      state.storage.settings,
      state.storage.subscription,
      entryIndex,
      setIndex,
      restTimer,
      restTimerSince
    );
  };
}

export function Thunk_completeSetExternal(
  entryIndex: number,
  setIndex: number,
  restTimer: number,
  restTimerSince: number
): IThunk {
  return async (dispatch, getState, env) => {
    const state = getState();
    const progress = Progress_getProgress(state);
    if (!progress) {
      return;
    }
    const entry = progress.entries[entryIndex];
    const isWarmup = setIndex < entry.warmupSets.length;
    let adjustedSetIndex = setIndex;
    if (!isWarmup) {
      adjustedSetIndex -= entry.warmupSets.length;
    }
    SendMessage_print(`Main App: complete set entryIndex: ${entryIndex}, setIndex: ${setIndex}`);
    const program = Program_getFullProgram(state, progress.programId);
    const evaluatedProgram = program ? Program_evaluate(program, state.storage.settings) : undefined;
    const programExercise = evaluatedProgram
      ? Program_getProgramExercise(progress.day, evaluatedProgram, entry.programExerciseId)
      : undefined;

    const set = isWarmup ? entry.warmupSets[adjustedSetIndex] : entry.sets[adjustedSetIndex];
    if (!set) {
      SendMessage_print(`Main App: Set not found at index ${adjustedSetIndex}, skipping`);
      dispatch(Thunk_updateLiveActivity(entryIndex, setIndex, restTimer, restTimerSince));
      return;
    }
    if (set.isCompleted) {
      SendMessage_print(`Main App: Set already completed, refreshing live activity`);
      dispatch(Thunk_updateLiveActivity(entryIndex, setIndex, restTimer, restTimerSince));
      return;
    }

    dispatch({
      type: "CompleteSetAction",
      setIndex: adjustedSetIndex,
      entryIndex: entryIndex,
      programExercise: programExercise,
      otherStates: evaluatedProgram?.states,
      isPlayground: false,
      mode: isWarmup ? "warmup" : "workout",
      forceUpdateEntryIndex: true,
      isExternal: true,
    });
  };
}

export function Thunk_playAudioNotification(): IThunk {
  return async (dispatch, getState, env) => {
    if (getState().adminKey == null) {
      const settings = getState().storage.settings;
      env.audio.play(settings.volume, !!settings.vibration);
    }
  };
}

export function Thunk_handleWatchStorageMerge(storageJson: string, isLiveActivity?: boolean): IThunk {
  return async (dispatch, getState) => {
    try {
      const watchStorage: IStorage = JSON.parse(storageJson);
      const state = getState();

      const phoneHistoryLen = state.storage.history?.length ?? 0;
      const watchHistoryLen = watchStorage.history?.length ?? 0;

      // Check if we're currently on the progress screen
      const wasOnProgressScreen = Screen_currentName(state.screenStack) === "progress";
      const hadProgress = state.storage.progress && state.storage.progress.length > 0;

      // Merge watch storage with phone storage
      let mergedStorage = Storage_mergeStorage(state.storage, watchStorage, state.deviceId);

      // progress.ui is excluded from version-based merging, so amrapModal set by
      // live activity mutations gets dropped. Propagate it explicitly.
      const watchAmrapModal = watchStorage.progress?.[0]?.ui?.amrapModal;
      if (isLiveActivity && watchAmrapModal && mergedStorage.progress?.[0]) {
        mergedStorage = {
          ...mergedStorage,
          progress: [
            {
              ...mergedStorage.progress[0],
              ui: {
                ...mergedStorage.progress[0].ui,
                amrapModal: watchAmrapModal,
                isExternal: watchStorage.progress[0].ui?.isExternal,
                forceUpdateEntryIndex: watchStorage.progress[0].ui?.forceUpdateEntryIndex,
              },
            },
          ],
        };
      }

      if (Storage_isChanged(state.storage, mergedStorage)) {
        // Also merge into lastSyncedStorage to preserve phone's unsent changes
        // This ensures prepareSync won't re-detect watch's changes as new phone changes
        const mergedLastSynced = state.lastSyncedStorage
          ? Storage_mergeStorage(state.lastSyncedStorage, watchStorage, state.deviceId)
          : mergedStorage;

        const mergedHistoryLen = mergedStorage.history?.length ?? 0;

        if (phoneHistoryLen > 0 && mergedHistoryLen < phoneHistoryLen) {
          lg("ls-history-deletion-watch-merge", {
            phoneHistoryLen,
            watchHistoryLen,
            mergedHistoryLen,
          });
        }

        updateState(
          dispatch,
          [
            lb<IState>().p("storage").record(mergedStorage),
            lb<IState>().p("lastSyncedStorage").record(mergedLastSynced),
          ],
          "Merge watch storage"
        );
        SendMessage_print("handleWatchStorageMerge: successfully merged watch storage");

        // If we were on the progress screen and progress is now empty (workout finished on watch),
        // navigate back to the main screen to avoid showing an empty/broken workout screen
        const progressIsNowEmpty = !mergedStorage.progress || mergedStorage.progress.length === 0;
        if (wasOnProgressScreen && hadProgress && progressIsNowEmpty) {
          SendMessage_print("handleWatchStorageMerge: workout finished on watch, navigating to main screen");
          dispatch(Thunk_pushScreen("main", undefined, true));
        }
      } else {
        SendMessage_print("handleWatchStorageMerge: no changes after merge");
      }
    } catch (error) {
      SendMessage_print(`handleWatchStorageMerge: failed to merge storage: ${error}`);
    }
  };
}

export function Thunk_reloadStorageFromDisk(): IThunk {
  return async (dispatch, getState) => {
    try {
      const currentAccount = (await IndexedDBUtils_get("current_account")) as string | undefined;
      if (!currentAccount) {
        SendMessage_print("reloadStorageFromDisk: no current_account");
        return;
      }

      const rawStorage = (await IndexedDBUtils_get(`liftosaur_${currentAccount}`)) as string | undefined;
      if (!rawStorage) {
        SendMessage_print("reloadStorageFromDisk: no storage found");
        return;
      }

      const parsed = JSON.parse(rawStorage);
      const storage: IStorage = parsed?.storage;
      const lastSyncedStorage: IStorage | undefined = parsed?.lastSyncedStorage;

      if (!storage) {
        SendMessage_print("reloadStorageFromDisk: invalid storage format");
        return;
      }

      const currentState = getState();
      const currentHistoryLen = currentState.storage.history?.length ?? 0;
      const diskHistoryLen = storage.history?.length ?? 0;

      if (currentHistoryLen > 0 && diskHistoryLen === 0) {
        lg("ls-history-deletion-reload-disk", {
          currentHistoryLen,
          diskHistoryLen,
        });
      }

      updateState(
        dispatch,
        [
          lb<IState>().p("storage").record(storage),
          lb<IState>()
            .p("lastSyncedStorage")
            .record(lastSyncedStorage ?? storage),
        ],
        "Reload storage from disk"
      );
    } catch (error) {
      SendMessage_print(`reloadStorageFromDisk: failed: ${error}`);
    }
  };
}

export function Thunk_fetchStorage(storageId?: string): IThunk {
  return async (dispatch, getState, env) => {
    if (getState().errors.corruptedstorage == null) {
      const result = await load(dispatch, "Loading from cloud", () => {
        const state = getState();
        const url = typeof window !== "undefined" ? UrlUtils.build(window.location.href) : undefined;
        const userId = url != null ? url.searchParams.get("userid") : state.user?.id;
        return env.service.getStorage(state.storage.tempUserId, userId || undefined, storageId, state.adminKey);
      });
      await handleLogin(dispatch, result, env.service.client, getState().user?.id || getState().storage.tempUserId);
    }
  };
}

export function Thunk_pushToEditProgram(dayData?: Required<IDayData>, key?: string): IThunk {
  return async (dispatch, getState) => {
    const state = getState();
    const currentProgram =
      state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;
    if (Program_isEmpty(currentProgram)) {
      dispatch(Thunk_pushScreen("programs"));
    } else if (currentProgram) {
      Program_editAction(dispatch, currentProgram, dayData, key, true);
    }
  };
}

export function Thunk_startProgramDay(programId?: string): IThunk {
  return async (dispatch, getState) => {
    const state = getState();
    const progress = Progress_getCurrentProgress(state);
    if (progress != null) {
      dispatch(Thunk_pushScreen("progress", { id: progress.id }, true));
    } else if (state.storage.currentProgramId != null) {
      const program = Program_getProgram(state, programId ?? state.storage.currentProgramId);
      if (program != null) {
        const newProgress = Program_nextHistoryRecord(program, state.storage.settings, state.storage.stats);
        updateState(dispatch, [lb<IState>().p("storage").p("progress").record([newProgress])], "Create new progress");
        dispatch(Thunk_pushScreen("progress", { id: newProgress.id }, true));
      } else {
        alert("No currently selected program");
      }
    }
  };
}

export function Thunk_pushToEditProgramExercise(key: string, dayData: Required<IDayData>): IThunk {
  return async (dispatch, getState) => {
    const state = getState();
    const programScreen = [...state.screenStack].reverse().find((s) => s.name === "editProgram");
    const data = programScreen?.name === "editProgram" ? programScreen.params?.plannerState : undefined;
    const currentProgram =
      data?.current.program ||
      (state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined);
    if (currentProgram && !Program_isEmpty(currentProgram)) {
      const plannerState = EditProgram_initPlannerProgramExerciseState(
        currentProgram,
        state.storage.settings,
        key,
        dayData,
        !programScreen
      );
      dispatch(Thunk_pushScreen("editProgramExercise", { key, dayData, plannerState }));
    } else {
      dispatch(Thunk_pushScreen("main"));
    }
  };
}

export function Thunk_pushScreen<T extends IScreen>(
  screen: T,
  params?: IScreenParams<T>,
  shouldResetStack?: boolean
): IThunk {
  return async (dispatch, getState) => {
    dispatch(Thunk_postevent("navigate-to-" + screen));
    if (shouldResetStack) {
      const confirmation = Screen_shouldConfirmNavigation(getState(), true);
      if (confirmation) {
        if (confirm(confirmation)) {
          cleanup(dispatch, getState());
          dispatch({ type: "PullScreen" });
        } else {
          return;
        }
      }
    }
    if (
      ["musclesProgram", "musclesDay", "graphs"].indexOf(screen) !== -1 &&
      !Subscriptions_hasSubscription(getState().storage.subscription)
    ) {
      shouldResetStack = false;
      screen = "subscription" as T;
    }
    const screensWithoutCurrentProgram = [
      "first",
      "onboarding",
      "units",
      "programs",
      "programPreview",
      "setupequipment",
    ];
    if (getState().storage.currentProgramId == null && screensWithoutCurrentProgram.indexOf(screen) === -1) {
      screen = "programs" as T;
    }
    dispatch({ type: "PushScreen", screen, params, shouldResetStack });
    window.scroll(0, 0);
  };
}

export function Thunk_updateScreenParams<T extends IScreen>(params?: IScreenParams<T>): IThunk {
  return async (dispatch, getState) => {
    updateState(
      dispatch,
      [
        lb<IState>()
          .p("screenStack")
          .recordModify((stack) => {
            return Screen_updateParams(stack, params);
          }),
      ],
      "Update screen params"
    );
  };
}

export function Thunk_maybeRequestReview(): IThunk {
  return async (dispatch, getState) => {
    try {
      const history = getState().storage.history;
      const state = getState();
      const now = Date.now();
      const reviewRequests = state.storage.reviewRequests;
      const lastReviewRequest = reviewRequests[reviewRequests.length - 1];
      if (
        history.length > 10 &&
        reviewRequests.length < 3 &&
        (!lastReviewRequest || now - lastReviewRequest > 1000 * 60 * 60 * 24 * 32)
      ) {
        dispatch(Thunk_postevent("request-review"));
        SendMessage_toIos({ type: "requestReview" });
        SendMessage_toAndroid({ type: "requestReview" });
      }
    } catch (error) {
      const e = error as Error;
      Rollbar.error(e);
    }
  };
}

export function Thunk_maybeRequestSignup(): IThunk {
  return async (dispatch, getState) => {
    try {
      const history = getState().storage.history;
      const state = getState();
      const now = Date.now();
      const signupRequests = state.storage.signupRequests;
      const lastsignupRequest = signupRequests[signupRequests.length - 1];
      if (
        state.user?.id == null &&
        history.length > 8 &&
        signupRequests.length < 3 &&
        (!lastsignupRequest || now - lastsignupRequest > 1000 * 60 * 60 * 24 * 14)
      ) {
        dispatch(Thunk_postevent("request-signup"));
        updateState(dispatch, [lb<IState>().p("showSignupRequest").record(true)], "Show signup request");
      }
    } catch (error) {
      const e = error as Error;
      Rollbar.error(e);
    }
  };
}

function cleanup(dispatch: IDispatch, state: IState): void {
  const progress = Progress_getProgress(state);
  if (progress && !Progress_isCurrent(progress)) {
    updateState(
      dispatch,
      [
        lb<IState>()
          .pi("progress")
          .recordModify((progresses) => Progress_stop(progresses, progress.id)),
      ],
      "Stop workout progress"
    );
  }
}

export function Thunk_pullScreen(): IThunk {
  return async (dispatch, getState) => {
    const confirmation = Screen_shouldConfirmNavigation(getState(), false);
    if (confirmation) {
      if (confirm(confirmation)) {
        cleanup(dispatch, getState());
      } else {
        return;
      }
    }
    dispatch({ type: "PullScreen" });
    window.scroll(0, 0);
  };
}

export function Thunk_fetchPrograms(): IThunk {
  return async (dispatch, getState, env) => {
    const result = await load(dispatch, "Loading programs", async () => {
      const index = await env.service.programsIndex();
      const details = await Promise.all(index.map((entry) => env.service.programDetail(entry.id)));
      const programs = index.map((entry, i) => {
        const detail = details[i];
        const program: IProgram = {
          ...Program_create(entry.name, entry.id),
          author: entry.author,
          url: entry.url,
          shortDescription: entry.shortDescription,
          description: entry.description || "",
          isMultiweek: entry.isMultiweek,
          tags: entry.tags as IProgram["tags"],
          planner: detail.planner,
        };
        return program;
      });
      return { programs, index };
    });
    if (result) {
      dispatch({
        type: "UpdateState",
        lensRecording: [
          lb<IState>().p("programs").record(result.programs),
          lb<IState>().p("programsIndex").record(result.index),
        ],
        desc: "Set loaded Programs",
      });
    }
  };
}

export function Thunk_fetchRevisions(programId: string, cb: () => void): IThunk {
  return async (dispatch, getState, env) => {
    const programRevisions = await load(dispatch, "Loading revisions", () =>
      env.service.getProgramRevisions(programId)
    );
    if (programRevisions.success) {
      updateState(
        dispatch,
        [
          lb<IState>()
            .p("revisions")
            .recordModify((revisions) => {
              return { ...revisions, [programId]: programRevisions.data };
            }),
        ],
        "Set loaded Revisions"
      );
    } else {
      alert("Couldn't fetch program revisions");
    }
    cb();
  };
}

export function Thunk_exportStorage(): IThunk {
  return async (dispatch, getState, env) => {
    dispatch(Thunk_postevent("export-storage-to-json"));
    ImportExporter_exportStorage(getState().storage);
  };
}

export function Thunk_exportProgramToFile(program: IProgram): IThunk {
  return async (dispatch, getState, env) => {
    dispatch(Thunk_postevent("export-program-to-file"));
    const state = getState();
    Program_exportProgramToFile(program, state.storage.settings, state.storage.version);
  };
}

export function Thunk_exportProgramToLink(program: IProgram): IThunk {
  return async (dispatch, getState, env) => {
    dispatch(Thunk_postevent("export-program-to-link"));
    const state = getState();
    const link = await Program_exportProgramToLink(program, state.storage.settings, state.storage.version);
    await ClipboardUtils_copy(link);
    alert("Link copied to clipboard:\n\n" + link);
  };
}

export function Thunk_exportHistoryToCSV(): IThunk {
  return async (dispatch, getState, env) => {
    dispatch(Thunk_postevent("export-history-to-csv"));
    const state = getState();
    const csv = CSV_toString(History_exportAsCSV(state.storage.history, state.storage.settings));
    Exporter_toFile(`liftosaur_${DateUtils_formatYYYYMMDD(Date.now())}.csv`, csv);
  };
}

export function Thunk_exportProgramsToText(): IThunk {
  return async (dispatch, getState, env) => {
    dispatch(Thunk_postevent("export-programs-to-text"));
    let text = "";
    for (const program of getState().storage.programs) {
      if (!program.planner) {
        continue;
      }
      text += `======= ${program.name} =======\n\n`;
      text += PlannerProgram.generateFullText(program.planner.weeks);
      text += `\n\n\n`;
    }
    Exporter_toFile(`liftosaur_all_programs_${DateUtils_formatYYYYMMDD(Date.now())}.txt`, text);
  };
}

export function Thunk_importStorage(maybeStorage: string): IThunk {
  return async (dispatch) => {
    dispatch(Thunk_postevent("import-json-storage"));
    let parsedMaybeStorage: Record<string, unknown>;
    try {
      parsedMaybeStorage = JSON.parse(maybeStorage);
    } catch (e) {
      alert("Couldn't parse the provided file");
      return;
    }
    const result = Storage_get(parsedMaybeStorage, false);
    if (result.success) {
      updateState(dispatch, [lb<IState>().p("storage").record(result.data)], "Importing Storage");
      alert("Successfully imported");
    } else {
      alert(`Couldn't import the storage, errors: \n${result.error.join("\n")}`);
    }
  };
}

export function Thunk_importCsvData(rawCsv: string): IThunk {
  return async (dispatch, getState, env) => {
    try {
      dispatch(Thunk_postevent("import-csv-data"));
      const { historyRecords, customExercises } = ImportFromLiftosaur.convertLiftosaurCsvToHistoryRecords(
        rawCsv,
        getState().storage.settings
      );
      updateState(
        dispatch,
        [
          lb<IState>()
            .p("storage")
            .p("history")
            .recordModify((oldHistoryRecords) => {
              return CollectionUtils_sortBy(
                CollectionUtils_uniqBy(oldHistoryRecords.concat(historyRecords), "id"),
                "id"
              );
            }),
          lb<IState>()
            .p("storage")
            .p("settings")
            .p("exercises")
            .recordModify((oldExercises) => {
              return { ...oldExercises, ...customExercises };
            }),
        ],
        "Import Strong CSV data"
      );
    } catch (e) {
      console.error(e);
      alert("Couldn't parse the provided file");
    }
  };
}

export function Thunk_importFromLink(link: string): IThunk {
  return async (dispatch, getState, env) => {
    dispatch(Thunk_postevent("import-from-link"));
    const data = await ImportFromLink_importFromLink(link, env.service.client);
    if (data.success) {
      if (data.data.source) {
        Storage_setAffiliate(dispatch, data.data.source, "program");
      }
      dispatch(Thunk_importProgram(data.data));
    } else {
      alert(data.error.join("\n"));
    }
  };
}

export function Thunk_generateAndCopyLink(
  editProgram: IProgram,
  settings: ISettings,
  cb: (link: string) => void
): IThunk {
  return async (dispatch, getState, env) => {
    dispatch(Thunk_postevent("generate-and-copy-link"));
    const link = await Program_exportProgramToLink(editProgram, settings, getLatestMigrationVersion());
    try {
      const state = getState();
      const service = new Service(env.service.client);
      const url = await service.postShortUrl(
        link,
        "p",
        state.storage.settings.affiliateEnabled && state.user?.id ? state.user.id : undefined
      );
      ClipboardUtils_copy(url);
      cb(url);
    } catch (error) {
      const e = error as Error;
      Rollbar.error(e);
      ClipboardUtils_copy(link);
      cb(link);
    }
  };
}

export function Thunk_importProgram(importLinkData: IImportLinkData): IThunk {
  return async (dispatch, getState, env) => {
    dispatch(Thunk_postevent("import-program-from-link"));
    const { decoded: maybeProgram, source, userid } = importLinkData;
    const state = getState();
    const result = await ImportExporter_getExportedProgram(env.service.client, maybeProgram, state.storage.settings);
    if (result.success) {
      const { program, customExercises } = result.data;
      const existingCustomExerciseNames = new Set(
        CollectionUtils_compact(ObjectUtils_values(state.storage.settings.exercises).map((e) => e?.name))
      );
      const newCustomExercises = ObjectUtils_filter(
        customExercises,
        (_, v) => v != null && !existingCustomExerciseNames.has(v.name)
      );
      if (source) {
        program.source = source;
      }
      if (userid) {
        program.authorid = userid;
      }
      const newProgram: IProgram = { ...ObjectUtils_clone(program), clonedAt: Date.now() };
      if (!confirm(`Do you want to import program ${newProgram.name}?`)) {
        return;
      }
      const hasExistingProgram = getState().storage.programs.some((p) => p.id === newProgram.id);
      if (hasExistingProgram && !confirm("Program with the same id already exists, do you want to overwrite it?")) {
        return;
      }
      if (newProgram.planner && PlannerProgram.hasNonSelectedWeightUnit(newProgram.planner, state.storage.settings)) {
        const fromUnit = Weight_oppositeUnit(state.storage.settings.units);
        const toUnit = state.storage.settings.units;
        if (confirm(`The program has weights in ${fromUnit}, do you want to convert them to ${toUnit}?`)) {
          newProgram.planner = PlannerProgram.switchToUnit(newProgram.planner, state.storage.settings);
        }
      }
      updateState(
        dispatch,
        [
          lb<IState>()
            .p("storage")
            .p("settings")
            .p("exercises")
            .recordModify((e) => ({ ...e, ...newCustomExercises })),
          lb<IState>()
            .p("storage")
            .p("programs")
            .recordModify((programs) => {
              const index = programs.findIndex((p) => p.id === newProgram.id);
              if (index !== -1) {
                return CollectionUtils_setAt(programs, index, newProgram);
              } else {
                return [...programs, newProgram];
              }
            }),
        ],
        "Importing Program"
      );
      alert("Successfully imported");
    } else {
      alert(result.error.join("\n"));
    }
  };
}

export function Thunk_createAccount(): IThunk {
  return async (dispatch, getState, env) => {
    dispatch(Thunk_postevent("create-account"));
    dispatch(
      Thunk_logOut(async () => {
        const newState = await getInitialState(env.service.client, { deviceId: getState().deviceId });
        dispatch({ type: "ReplaceState", state: newState });
        dispatch(Thunk_fetchInitial());
      })
    );
  };
}

export function Thunk_deleteAccount(id: string, cb?: () => void): IThunk {
  return async (dispatch, getState, env) => {
    dispatch(Thunk_postevent("delete-local-account"));
    await IndexedDBUtils_remove(`liftosaur_${id}`);
    if (cb) {
      cb();
    }
  };
}

export function Thunk_deleteAccountRemote(cb?: (result: boolean) => void): IThunk {
  return async (dispatch, getState, env) => {
    await load(dispatch, "Delete cloud account", () => {
      return new Promise(async (resolve) => {
        dispatch(Thunk_postevent("delete-remove-account"));
        const result = await env.service.deleteAccount();
        dispatch(
          Thunk_logOut(() => {
            if (cb) {
              cb(result);
              resolve(result);
            }
          })
        );
      });
    });
  };
}

export function Thunk_switchAccount(id: string): IThunk {
  return async (dispatch, getState, env) => {
    dispatch(
      Thunk_logOut(async () => {
        dispatch(Thunk_postevent("switch-account"));
        const rawStorage = (await IndexedDBUtils_get(`liftosaur_${id}`)) as string | undefined;
        if (rawStorage != null) {
          const result = Storage_get(JSON.parse(rawStorage)?.storage);
          if (result.success) {
            const newState = await getInitialState(env.service.client, { rawStorage, deviceId: getState().deviceId });
            dispatch({ type: "ReplaceState", state: newState });
            dispatch(Thunk_fetchInitial());
          } else {
            console.error("Failed to switch account, error:", result.error);
            alert(`Error while trying to switch the account: ${result.error}`);
          }
        } else {
          console.error("Error while trying to switch the account: missing account", id);
          alert(`Error while trying to switch the account: missing account ${id}`);
        }
      })
    );
  };
}

export function Thunk_claimkey(): IThunk {
  return async (dispatch, getState, env) => {
    const claim = await env.service.postClaimKey(getState().storage.tempUserId);
    if (claim) {
      finishFreeAccess(dispatch, claim.key, claim.expires);
    } else {
      alert("Failed to claim the free access");
      dispatch(Thunk_log("ls-claim-free-user-fail"));
    }
  };
}

function finishFreeAccess(dispatch: IDispatch, key: string, expires: number): void {
  updateState(dispatch, [lb<IState>().p("storage").p("subscription").p("key").record(key)], "Set subscription key");
  const date = DateUtils_format(expires);
  alert(`Successfully claimed the free access until ${date}`);
  dispatch(Thunk_log("ls-claim-free-user-success"));
  dispatch(Thunk_pullScreen());
}

export function Thunk_fetchInitial(): IThunk {
  return async (dispatch, getState, env) => {
    if (getState().storage.whatsNew == null) {
      WhatsNew_updateStorage(dispatch);
    }
    dispatch(Thunk_fetchPrograms());
    if (getState().storage.subscription.apple.length > 0) {
      dispatch(Thunk_postevent("check-apple-subscription"));
      const receipt = getState().storage.subscription.apple[0]?.value;
      const userId = getState().user?.id || getState().storage.tempUserId;
      const isVerified = await Subscriptions_verifyAppleReceipt(userId, env.service, receipt);
      if (!isVerified) {
        dispatch(Thunk_postevent("apple-subscription-invalid-restore"));
        await Subscriptions_cleanupOutdatedAppleReceipts(
          dispatch,
          userId,
          env.service,
          getState().storage.subscription
        );
        SendMessage_toIos({ type: "restoreSubscriptions" });
      } else {
        dispatch(Thunk_postevent("apple-subscription-verified"));
        if (getState().storage.subscription.apple.length === 0) {
          Subscriptions_setAppleReceipt(dispatch, receipt);
        }
      }
    }
    SendMessage_toAndroid({ type: "restoreSubscriptions" });
  };
}

export function Thunk_redeemCoupon(code: string, cb: (success: boolean) => void): IThunk {
  return async (dispatch, getState, env) => {
    dispatch(Thunk_postevent("redeem-coupon"));
    const platform = SendMessage_isIos() ? "ios" : SendMessage_isAndroid() ? "android" : undefined;
    const result = await load(dispatch, "Claiming coupon", () => env.service.postClaimCoupon(code, platform));
    if (result.success) {
      const { key, expires, appleOffer, googleOffer, affiliate } = result.data;
      if (appleOffer) {
        console.log("Apple promotional offer data:", appleOffer);
        updateState(dispatch, [lb<IState>().p("appleOffer").record(appleOffer)], "Set apple promotional offer");
        lg("ls-coupon-applied", { code, type: "apple" });
        alert("Coupon has been applied! Proceed to purchase now.");
      } else if (googleOffer) {
        console.log("Google promotional offer data:", googleOffer);
        updateState(dispatch, [lb<IState>().p("googleOffer").record(googleOffer)], "Set google promotional offer");
        lg("ls-coupon-applied", { code, type: "google" });
        alert("Coupon has been applied! Proceed to purchase now.");
      } else if (key && expires) {
        finishFreeAccess(dispatch, key, expires);
      }
      if (affiliate) {
        Storage_setAffiliate(dispatch, affiliate, "coupon");
      }
      cb(true);
    } else {
      switch (result.error) {
        case "not_authorized": {
          alert("You need to sign in first to claim the coupon.");
          break;
        }
        case "coupon_not_found": {
          alert("Couldn't find the coupon with that code.");
          break;
        }
        case "coupon_disabled": {
          alert("Couldn't find the coupon with that code.");
          break;
        }
        case "coupon_already_claimed": {
          alert("This coupon is already claimed.");
          break;
        }
        case "wrong_platform": {
          alert("This coupon could only be activated on Android or iOS.");
          break;
        }
        default: {
          alert("Failed to claim the coupon.");
          break;
        }
      }
      dispatch(Thunk_log("ls-claim-coupon-fail"));
      cb(false);
    }
  };
}

export function Thunk_setAppleReceipt(receipt?: string): IThunk {
  return async (dispatch, getState, env) => {
    if (receipt) {
      if (
        await Subscriptions_verifyAppleReceipt(
          getState().user?.id || getState().storage.tempUserId,
          env.service,
          receipt
        )
      ) {
        dispatch(Thunk_postevent("complete-apple-subscription"));
        dispatch(Thunk_log("ls-set-apple-receipt"));
        Subscriptions_setAppleReceipt(dispatch, receipt);
        if (Screen_currentName(getState().screenStack) === "subscription") {
          dispatch(Thunk_pullScreen());
        }
      } else {
        dispatch(Thunk_postevent("apple-subscription-invalid"));
      }
    }
  };
}

export function Thunk_pushExerciseStatsScreen(exerciseType: IExerciseType): IThunk {
  return async (dispatch, getState, env) => {
    updateState(dispatch, [lb<IState>().p("viewExerciseType").record(exerciseType)], "Set exercise type to view");
    dispatch(Thunk_pushScreen("exerciseStats"));
  };
}

export function Thunk_setGooglePurchaseToken(productId?: string, token?: string): IThunk {
  return async (dispatch, getState, env) => {
    if (productId && token) {
      const purchaseToken = JSON.stringify({ productId, token });
      const state = getState();
      const userId = state.user?.id || state.storage.tempUserId;
      if (await Subscriptions_verifyGooglePurchaseToken(env.service, userId, purchaseToken)) {
        dispatch(Thunk_postevent("complete-google-subscription"));
        dispatch(Thunk_log("ls-set-google-purchase-token"));
        Subscriptions_setGooglePurchaseToken(dispatch, purchaseToken);
        if (Screen_currentName(getState().screenStack) === "subscription") {
          dispatch(Thunk_pullScreen());
        }
      } else {
        dispatch(Thunk_postevent("google-subscription-invalid", { productId, token }));
      }
    }
  };
}

async function load<T>(dispatch: IDispatch, type: string, cb: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const name = UidFactory_generateUid(4);
    _load(dispatch, name, type, cb, 0, resolve, reject);
  });
}

function _load<T>(
  dispatch: IDispatch,
  name: string,
  type: string,
  cb: () => Promise<T>,
  attempt: number,
  resolve: (arg: T) => void,
  reject: (arg: unknown) => void
): void {
  updateState(
    dispatch,
    [
      lb<IState>()
        .p("loading")
        .p("items")
        .p(name)
        .recordModify((i) => {
          if (i == null) {
            return { startTime: Date.now(), attempt, type };
          } else {
            return { ...i, attempt };
          }
        }),
    ],
    "Start loading"
  );
  cb()
    .then((r) => {
      updateState(
        dispatch,
        [
          lb<IState>().p("loading").p("items").pi(name).p("endTime").record(Date.now()),
          lb<IState>().p("loading").p("items").pi(name).p("error").record(undefined),
        ],
        "End loading"
      );
      resolve(r);
    })
    .catch((e) => {
      if (e.name === "AbortError") {
        updateState(
          dispatch,
          [
            lb<IState>().p("loading").p("items").pi(name).p("endTime").record(Date.now()),
            lb<IState>().p("loading").p("items").pi(name).p("error").record(undefined),
          ],
          "Abort loading"
        );
        reject(e);
        return;
      }
      if (attempt >= 3 || (e instanceof NoRetryError && e.noretry)) {
        updateState(
          dispatch,
          [
            lb<IState>().p("loading").p("items").pi(name).p("error").record(`${type} failed`),
            lb<IState>().p("loading").p("items").pi(name).p("endTime").record(Date.now()),
          ],
          `Failed loading`
        );
        if (type === "Logging in") {
          Rollbar.error("Error while logging in", {
            error: e instanceof Error ? e.message : String(e),
          });
          Rollbar.error(e);
        }
        reject(e);
      } else {
        setTimeout(() => {
          _load(dispatch, name, type, cb, attempt + 1, resolve, reject);
        }, 1000);
      }
    });
}

async function handleLogin(
  dispatch: IDispatch,
  result: IGetStorageResponse,
  client: Window["fetch"],
  oldUserId?: string
): Promise<void> {
  try {
    if (result.email != null) {
      dispatch(Thunk_postevent("login"));
      Rollbar.configure(RollbarUtils_config({ person: { email: result.email, id: result.user_id } }));
      let storage: IStorage;
      const storageResult = Storage_get(result.storage, true);
      const service = new Service(client);
      if (storageResult.success) {
        storage = storageResult.data;
      } else {
        storage = result.storage;
        const userid = result.user_id || result.storage.tempUserId || `missing-${UidFactory_generateUid(8)}`;
        await service.postDebug(userid, JSON.stringify(result.storage), { local: "false" });
      }
      storage.tempUserId = result.user_id;
      storage.email = result.email;
      if (result.is_new_user && oldUserId) {
        try {
          await service.postDebug(oldUserId, JSON.stringify(window.state || {}), {
            new_userid: result.user_id,
            email: result.email,
          });
        } catch (e) {
          console.error("Failed to upload debug data for old user", e);
        }
      }
      if (oldUserId === result.user_id) {
        dispatch(Thunk_postevent("login-same-user"));
        updateState(dispatch, [lb<IState>().p("lastSyncedStorage").record(storage)], "Set last synced on login");
        dispatch({ type: "Login", email: result.email, userId: result.user_id });
        if (storage.subscription.key !== result.key) {
          updateState(
            dispatch,
            [lb<IState>().p("storage").p("subscription").p("key").record(result.key)],
            "Set subscription key from login"
          );
        }
      } else {
        dispatch(Thunk_postevent("login-different-user"));
        storage.subscription.key = result.key;
        const newState = await getInitialState(client, { storage, deviceId: await DeviceId.get() });
        newState.lastSyncedStorage = ObjectUtils_clone(newState.storage);
        newState.user = { id: result.user_id, email: result.email };
        dispatch({ type: "ReplaceState", state: newState });
      }
      dispatch(Thunk_fetchInitial());
      SendMessage_toIos({ type: "authChanged", userId: result.user_id });
    } else if (result.key) {
      updateState(
        dispatch,
        [lb<IState>().p("storage").p("subscription").p("key").record(result.key)],
        "Set subscription free user key"
      );
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
}
