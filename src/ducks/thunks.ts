import { IThunk, IDispatch } from "./types";
import type { NavigationAction } from "@react-navigation/native";
import { IScreen, IScreenData, IScreenParams } from "../models/screen";
import type { INavigateOpts } from "../navigation/navigationService";
import type { IAllScreenParamList } from "../navigation/types";

import { getNavigationService } from "../navigation/navUtils";
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
import { SignIn_google, SignIn_apple, SignOut_google } from "../utils/signIn";
import { Platform } from "react-native";
import { Dialog_confirm, Dialog_alert } from "../utils/dialog";
import { InAppReview_request } from "../utils/inAppReview";
import {
  IApplePromotionalOffer,
  IEnv,
  IGooglePromotionalOffer,
  ILocalStorage,
  IOfferData,
  IState,
  ISubscriptionLoading,
  updateProgress,
  updateState,
} from "../models/state";
import { AdminDebug_fetchStorage, AdminDebug_isDebugAccountId } from "../models/adminDebug";
import {
  IProgram,
  IStorage,
  IExerciseType,
  ISettings,
  IDayData,
  IHistoryRecord,
  IWeight,
  IPercentage,
  ILength,
  ICustomExercise,
  IImportSession,
} from "../types";
import { CollectionUtils_compact, CollectionUtils_setAt } from "../utils/collection";
import { ImportExporter_exportStorage, ImportExporter_getExportedProgram } from "../lib/importexporter";
import { Storage_mergeStorage, Storage_isChanged, Storage_get, Storage_setAffiliate } from "../models/storage";
import { History_exportAsCSV } from "../models/history";
import { ImportSession_apply, ImportSession_findEditedRecordIds, ImportSession_undo } from "../models/importSession";
import { ImportFileError } from "../utils/importTypes";
import { StringUtils_pluralize } from "../utils/string";
import { CSV_toString } from "../utils/csv";
import { Exporter_toFile } from "../utils/exporter";
import { DateUtils_formatYYYYMMDD, DateUtils_format } from "../utils/date";
import { getInitialState } from "./reducer";
import { IndexedDBUtils_get, IndexedDBUtils_remove, IndexedDBUtils_set } from "../utils/indexeddb";
import { WhatsNew_updateStorage } from "../models/whatsnewUtils";
import { Screen_shouldConfirmNavigation } from "../models/screen";
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
  SendMessage_toAndroidWithResult,
  SendMessage_toIos,
  SendMessage_print,
  SendMessage_toAndroid,
  SendMessage_isAndroid,
} from "../utils/sendMessage";
import { IIapPurchase, IIapPurchaseError } from "../utils/iapAdapter";
import {
  IapHelpers_alertAlreadySubscribed,
  IapHelpers_applePromoToAdapter,
  IapHelpers_clearLoading,
  IapHelpers_setLoading,
  IapHelpers_getSkus,
  IapHelpers_readReceiptOrJwsIOS,
} from "../utils/iapHelpers";
import { UidFactory_generateUid } from "../utils/generator";
import { ClipboardUtils_copy } from "../utils/clipboard";
import {
  Progress_getProgress,
  Progress_getProgressById,
  Progress_updateTimer,
  Progress_getCurrentProgress,
  Progress_isCurrent,
  Progress_stop,
  Progress_scheduleTimerNotification,
} from "../models/progress";
import { NativeTimerBridge_stopTimer } from "../utils/nativeTimerBridge";
import { NativeWorkoutBridge_discardWorkout } from "../utils/nativeWorkoutBridge";
import { IImportLinkData, ImportFromLink_importFromLink } from "../utils/importFromLink";
import { getLatestMigrationVersion } from "../migrations/migrations";
import { LogUtils_log } from "../utils/log";
import { lg } from "../utils/posthog";
import { RollbarUtils_config } from "../utils/rollbar";
import { UrlUtils_build } from "../utils/url";
import { ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords } from "../utils/importFromLiftosaur";
import { ImportFromHevy_convertHevyCsvToHistoryRecords } from "../utils/importFromHevy";
import { Sync_getStorageUpdate2 } from "../utils/sync";
import { ObjectUtils_values, ObjectUtils_filter, ObjectUtils_clone, ObjectUtils_omit } from "../utils/object";
import { EditStats_uploadHealthStats } from "../models/editStats";
import { HealthSync_eligibleForAppleHealth, HealthSync_eligibleForGoogleHealth } from "../lib/healthSync";
import {
  PlannerProgram_generateFullText,
  PlannerProgram_hasNonSelectedWeightUnit,
  PlannerProgram_switchToUnit,
} from "../pages/planner/models/plannerProgram";
import { Weight_oppositeUnit } from "../models/weight";
import { ICollectionVersions } from "../models/versionTracker";
import { DeviceId_get } from "../utils/deviceId";
import {
  LiveActivityManager_updateProgressLiveActivity,
  LiveActivityManager_updateLiveActivityForNextEntry,
} from "../utils/liveActivityManager";
import { KeychainStore_setAuthToken, KeychainStore_clearAuthToken, IAuthToken } from "../utils/keychainStore";
import { NativeWatchBridge_sendAuthToWatch, NativeWatchBridge_sendClearAuthToWatch } from "../utils/nativeWatchBridge";
import { Analytics_trackPurchase, Analytics_trackSignUp } from "../utils/analytics";

declare let Rollbar: RB;

export class NoRetryError extends Error {
  public noretry = true;
}

export function Thunk_googleSignIn(cb?: (state: IState) => void): IThunk {
  return async (dispatch, getState, env) => {
    if (Platform.OS !== "web") {
      const result = await SignIn_google();
      if (result?.idToken == null && result?.accessToken == null) {
        if (cb) {
          cb(getState());
        }
        return;
      }
      const token = result.idToken || result.accessToken!;
      const state = getState();
      const userId = state.user?.id || state.storage.tempUserId;
      const loginResult = await load(dispatch, "Logging in", async () => {
        return env.service.googleSignIn(token, userId, {});
      });
      await load(dispatch, "Signing in", () => {
        return handleLogin(dispatch, loginResult, env.service.client, userId);
      });
      if (cb) {
        cb(getState());
      }
      dispatch(Thunk_sync2());
      return;
    }
    const url = UrlUtils_build(window.location.href);
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
          cb(getState());
        }
        dispatch(Thunk_sync2());
      }
    } else {
      const state = getState();
      const userId = state.user?.id || state.storage.tempUserId;
      const result = await env.service.googleSignIn(forcedUserEmail, userId, { forcedUserEmail });
      await load(dispatch, "Logging in", () => handleLogin(dispatch, result, env.service.client, userId));
      if (cb) {
        cb(getState());
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

export function Thunk_appleSignIn(cb?: (state: IState) => void): IThunk {
  return async (dispatch, getState, env) => {
    dispatch(Thunk_postevent("apple-sign-in"));
    let id_token: string | undefined;
    let code: string | undefined;
    if (Platform.OS !== "web") {
      const signInResult = await SignIn_apple();
      if (signInResult == null) {
        if (cb) {
          cb(getState());
        }
        return;
      }
      id_token = signInResult.idToken;
      code = signInResult.code ?? "";
    } else if (SendMessage_isIos()) {
      const result = await SendMessage_toIosWithResult<{ id_token: string; code: string } | { error: string }>({
        type: "signInWithApple",
      });
      if (!result) {
        return;
      }
      if ("error" in result) {
        Dialog_alert(result.error);
        return;
      } else {
        ({ id_token, code } = result);
      }
    } else {
      if (!window.AppleID?.auth) {
        Dialog_alert("Apple Sign In is not available");
        if (cb) {
          cb(getState());
        }
        return;
      }
      const response = await window.AppleID.auth.signIn();
      ({ id_token, code } = response.authorization);
    }
    if (id_token != null) {
      const state = getState();
      const userId = state.user?.id || state.storage.tempUserId;
      const result = await load(dispatch, "Logging in", async () =>
        env.service.appleSignIn(code ?? "", id_token!, userId)
      );
      await load(dispatch, "Signing in", () => handleLogin(dispatch, result, env.service.client, userId));
      if (cb) {
        cb(getState());
      }
      dispatch(Thunk_sync2());
    } else {
      if (cb) {
        cb(getState());
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
      try {
        await KeychainStore_clearAuthToken();
      } catch (e) {
        lg("ls-keychain-clear-auth-fail", { error: e instanceof Error ? e.message : String(e) });
      }
      await SignOut_google();
      NativeWatchBridge_sendClearAuthToWatch();
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
        Dialog_alert(
          "The version of the storage on a device is older than on the server, so sync failed. " +
            "To fix it - kill/restart the app a couple times."
        );
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
    const storageUpdate = Sync_getStorageUpdate2(state.storage, state.lastSyncedStorage, state.deviceId);
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
  const settings = getState().storage.settings;
  if (SendMessage_isIos()) {
    dispatch(Thunk_postevent("read-apple-health"));
    const result = await SendMessage_toIosWithResult({
      type: "getHealthKitData",
      weightunit: settings.units,
      lengthunit: settings.lengthUnits,
      anchor: settings.appleHealthAnchor,
    });
    if (result != null) {
      EditStats_uploadHealthStats("ios", dispatch, result, getState().storage.settings, getDeletedStats(getState()));
    }
    return;
  }
  if (SendMessage_isAndroid()) {
    dispatch(Thunk_postevent("read-google-health"));
    const result = await SendMessage_toAndroidWithResult({
      type: "getHealthKitData",
      weightunit: settings.units,
      lengthunit: settings.lengthUnits,
      anchor: settings.googleHealthAnchor,
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
    return;
  }
  if (!env.health) {
    return;
  }
  const platform: "ios" | "android" = Platform.OS === "ios" ? "ios" : "android";
  dispatch(Thunk_postevent(platform === "ios" ? "read-apple-health" : "read-google-health"));
  const anchor = platform === "ios" ? settings.appleHealthAnchor : settings.googleHealthAnchor;
  const result = await env.health.syncMeasurements({
    anchor,
    weightUnit: settings.units,
    lengthUnit: settings.lengthUnits,
  });
  EditStats_uploadHealthStats(
    platform,
    dispatch,
    { data: result },
    getState().storage.settings,
    getDeletedStats(getState())
  );
}

export function Thunk_saveWorkoutToHealth(args: {
  startMs: number;
  endMs: number;
  calories: number;
  intervals: [number, number | null][];
  successAlert?: boolean;
}): IThunk {
  return async (dispatch, getState, env) => {
    if (!env.health || AdminDebug_isDebugAccountId(getState().storage.tempUserId)) {
      return;
    }
    const platform = Platform.OS === "ios" ? "apple" : "google";
    dispatch(Thunk_postevent(`submit-workout-${platform}-health`));
    dispatch(
      Thunk_postevent(`storing-workout-to-${platform}-health`, {
        intervalsCount: args.intervals.length,
      })
    );
    try {
      await env.health.saveWorkout(args);
      dispatch(Thunk_postevent(`success-workout-${platform}-health`));
      if (args.successAlert) {
        Dialog_alert(`Synced to ${platform === "apple" ? "Apple Health" : "Google Health"}`);
      }
    } catch (e) {
      console.warn("Failed to save workout to Health", e);
      dispatch(Thunk_postevent(`fail-workout-${platform}-health`, { error: (e as Error)?.message ?? "unknown" }));
      Dialog_alert(`Couldn't save workout to ${platform === "apple" ? "Apple Health" : "Google Health"}`);
    }
  };
}

export function Thunk_saveMeasurementsToHealth(args: {
  bodyweight?: IWeight;
  bodyfat?: IPercentage;
  waist?: ILength;
  timestamp: number;
}): IThunk {
  return async (dispatch, getState, env) => {
    if (!env.health || AdminDebug_isDebugAccountId(getState().storage.tempUserId)) {
      return;
    }
    if (!args.bodyweight && !args.bodyfat && !args.waist) {
      return;
    }
    try {
      await env.health.saveMeasurements(args);
    } catch (e) {
      console.warn("Failed to save measurements to Health", e);
      const platform = Platform.OS === "ios" ? "apple" : "google";
      dispatch(
        Thunk_postevent(`${platform}-health-save-measurements-error`, {
          error: (e as Error)?.message ?? "unknown",
        })
      );
      Dialog_alert(`Couldn't save measurements to ${platform === "apple" ? "Apple Health" : "Google Health"}`);
    }
  };
}

export function Thunk_requestHealthPermissions(): IThunk {
  return async (_dispatch, getState, env) => {
    if (!env.health || AdminDebug_isDebugAccountId(getState().storage.tempUserId)) {
      return;
    }
    try {
      await env.health.requestPermissions();
    } catch (e) {
      console.warn("Failed to request health permissions", e);
    }
  };
}

export function Thunk_syncHealthKit(cb?: () => void): IThunk {
  return async (dispatch, getState, env) => {
    const state = getState();
    if (AdminDebug_isDebugAccountId(state.storage.tempUserId)) {
      if (cb != null) {
        cb();
      }
      return;
    }
    if (
      !(state.storage.settings.appleHealthSyncMeasurements && HealthSync_eligibleForAppleHealth()) &&
      !(state.storage.settings.googleHealthSyncMeasurements && HealthSync_eligibleForGoogleHealth())
    ) {
      if (cb != null) {
        cb();
      }
      return;
    }
    try {
      await env.queue.enqueue(async () => {
        try {
          await _syncHealthKit(dispatch, getState, env);
        } catch (e) {
          console.warn("Failed to sync from Health", e);
          const platform = Platform.OS === "ios" ? "apple" : "google";
          dispatch(Thunk_postevent(`${platform}-health-sync-error`, { error: (e as Error)?.message ?? "unknown" }));
        }
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
    LiveActivityManager_updateProgressLiveActivity(
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
  return async (dispatch, getState, env) => {
    try {
      const watchStorage: IStorage = JSON.parse(storageJson);
      const state = getState();

      const phoneHistoryLen = state.storage.history?.length ?? 0;
      const watchHistoryLen = watchStorage.history?.length ?? 0;

      const wasOnProgressScreen = env.getCurrentScreenData?.()?.name === "progress";
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

        const beforeProgress = state.storage.progress?.[0];
        const afterProgress = mergedStorage.progress?.[0];
        const timerChanged =
          beforeProgress?.timer !== afterProgress?.timer || beforeProgress?.timerSince !== afterProgress?.timerSince;
        if (timerChanged) {
          if (
            afterProgress?.timer != null &&
            afterProgress.timerSince != null &&
            afterProgress.timerEntryIndex != null &&
            afterProgress.timerMode != null &&
            Subscriptions_hasSubscription(mergedStorage.subscription)
          ) {
            const remaining = afterProgress.timer - (Date.now() - afterProgress.timerSince) / 1000;
            if (remaining > 0) {
              Progress_scheduleTimerNotification(
                afterProgress,
                afterProgress.timerEntryIndex,
                afterProgress.timerMode,
                mergedStorage.settings,
                remaining
              );
            } else {
              NativeTimerBridge_stopTimer();
            }
          } else {
            NativeTimerBridge_stopTimer();
          }
        }

        if (afterProgress != null && beforeProgress !== afterProgress) {
          const entryIndex = afterProgress.timerEntryIndex ?? 0;
          const mode = afterProgress.timerMode ?? "workout";
          const program = Program_getProgram(getState(), afterProgress.programId);
          const evaluatedProgram = program ? Program_evaluate(program, mergedStorage.settings) : undefined;
          const entry = afterProgress.entries[entryIndex];
          const programExercise =
            evaluatedProgram && entry
              ? Program_getProgramExercise(afterProgress.day, evaluatedProgram, entry.programExerciseId)
              : undefined;
          LiveActivityManager_updateLiveActivityForNextEntry(
            afterProgress,
            entryIndex,
            mode,
            programExercise,
            mergedStorage.settings,
            mergedStorage.subscription
          );
        }

        // If progress went from active to empty, the workout ended on the watch.
        // Run the same JS-side cleanup as a phone-side finish/discard so the
        // module-level reminder duration in nativeWorkoutBridge gets cleared.
        // Without this, the AppState listener can schedule a phantom "ongoing
        // workout" reminder the next time the phone backgrounds.
        const progressIsNowEmpty = !mergedStorage.progress || mergedStorage.progress.length === 0;
        if (hadProgress && progressIsNowEmpty) {
          NativeWorkoutBridge_discardWorkout();
        }
        if (wasOnProgressScreen && hadProgress && progressIsNowEmpty) {
          SendMessage_print("handleWatchStorageMerge: workout finished on watch, navigating to main screen");
          dispatch(Thunk_pushScreen("main", undefined, { tab: "home" }));
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
        const url = typeof window !== "undefined" ? UrlUtils_build(window.location.href) : undefined;
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
      dispatch(Thunk_pushScreen("programs", undefined, { tab: "program" }));
    } else if (currentProgram) {
      Program_editAction(dispatch, currentProgram, dayData, key, { tab: "program" });
    }
  };
}

export function Thunk_startProgramDay(programId?: string): IThunk {
  return async (dispatch, getState) => {
    const state = getState();
    const progress = Progress_getCurrentProgress(state);
    if (progress != null) {
      dispatch(Thunk_pushScreen("progress", { id: progress.id }, { tab: "workout" }));
    } else if (state.storage.currentProgramId != null) {
      const program = Program_getProgram(state, programId ?? state.storage.currentProgramId);
      if (program != null) {
        const newProgress = Program_nextHistoryRecord(program, state.storage.settings, state.storage.stats);
        updateState(dispatch, [lb<IState>().p("storage").p("progress").record([newProgress])], "Create new progress");
        dispatch(Thunk_pushScreen("progress", { id: newProgress.id }, { tab: "workout" }));
      } else {
        Dialog_alert("No currently selected program");
      }
    }
  };
}

export function Thunk_pushToEditProgramExercise(
  key: string,
  dayData: Required<IDayData>,
  workoutProgramId?: string
): IThunk {
  return async (dispatch, getState) => {
    const state = getState();
    const isFromWorkout = workoutProgramId != null;
    const editProgramIds = Object.keys(state.editProgramStates);
    const programId = isFromWorkout ? workoutProgramId : (editProgramIds[0] ?? state.storage.currentProgramId);
    const editProgramState = programId ? state.editProgramStates[programId] : undefined;
    const currentProgram = isFromWorkout
      ? programId != null
        ? Program_getProgram(state, programId)
        : undefined
      : editProgramState?.current.program || (programId != null ? Program_getProgram(state, programId) : undefined);
    if (currentProgram && !Program_isEmpty(currentProgram) && programId) {
      const { navigateTo } = await getNavigationService();
      navigateTo("editProgramExercise", { programId, key, dayData, fromWorkout: isFromWorkout });
    } else {
      dispatch(Thunk_pushScreen("main"));
    }
  };
}

export function Thunk_pushScreen<T extends IScreen>(
  screen: T,
  params?: IScreenParams<T>,
  opts?: INavigateOpts
): IThunk {
  return async (dispatch, getState) => {
    dispatch(Thunk_postevent("navigate-to-" + screen));
    if (
      ["musclesProgram", "musclesDay", "graphsList"].indexOf(screen) !== -1 &&
      !Subscriptions_hasSubscription(getState().storage.subscription)
    ) {
      opts = { stack: "subscription" };
      screen = "subscription" as T;
    }
    if (screen === "subscription") {
      opts = { ...opts, stack: "subscription" };
    }
    const screensWithoutCurrentProgram = [
      "first",
      "onboarding",
      "units",
      "programs",
      "programPreview",
      "setupequipment",
      "setupplates",
      "programselect",
    ];
    if (getState().storage.currentProgramId == null && screensWithoutCurrentProgram.indexOf(screen) === -1) {
      screen = "programs" as T;
    }
    const { navigateTo } = await getNavigationService();
    navigateTo(screen, params as IAllScreenParamList[typeof screen], opts);
    if (typeof window !== "undefined" && window.scroll) {
      window.scroll(0, 0);
    }
  };
}

export function Thunk_updateScreenParams<T extends IScreen>(params?: IScreenParams<T>): IThunk {
  return async (_dispatch, _getState, env) => {
    if (env.navigationRef?.isReady()) {
      env.navigationRef.setParams(params as Record<string, unknown>);
    }
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
        InAppReview_request();
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

export const screensWithEditState: IScreen[] = ["progress", "editProgram"];

function cleanupScreenEditState(dispatch: IDispatch, state: IState, screen: IScreenData): void {
  if (screen.name === "progress") {
    const progressId = screen.params?.id ?? 0;
    const progress = Progress_getProgressById(state, progressId);
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
  } else if (screen.name === "editProgram") {
    const programId = screen.params?.programId;
    if (programId != null && state.editProgramStates[programId] != null) {
      updateState(
        dispatch,
        [
          lb<IState>()
            .p("editProgramStates")
            .recordModify((states) => ObjectUtils_omit(states, [programId])),
        ],
        "Stop edit program"
      );
    }
  }
}

export function Thunk_cleanupRemovedScreens(screens: IScreenData[]): IThunk {
  return async (dispatch, getState) => {
    for (const screen of screens) {
      cleanupScreenEditState(dispatch, getState(), screen);
    }
  };
}

export function Thunk_pullScreen(): IThunk {
  return async () => {
    const { goBack } = await getNavigationService();
    goBack();
    if (typeof window !== "undefined" && window.scroll) {
      window.scroll(0, 0);
    }
  };
}

export function Thunk_confirmScreenLeave(screen: IScreenData, action: NavigationAction): IThunk {
  return async (dispatch, getState, env) => {
    // Save flows (e.g. Thunk_finishProgramDay) dispatch their commit synchronously
    // right after the navigation call that got prevented. Deferring a tick lets that
    // commit land, so the re-check below sees clean state and proceeds silently.
    await new Promise((resolve) => setTimeout(resolve, 0));
    const confirmation = Screen_shouldConfirmNavigation(getState(), screen);
    if (confirmation == null || (await Dialog_confirm(confirmation))) {
      env.navigationRef?.dispatch(action);
    }
  };
}

export function Thunk_editHistoryRecord(historyRecord: IHistoryRecord): IThunk {
  return async (dispatch) => {
    dispatch({ type: "EditHistoryRecord", historyRecord });
    const { navigateTo } = await getNavigationService();
    navigateTo("progress", { id: historyRecord.id });
  };
}

export function Thunk_finishProgramDay(id: number): IThunk {
  return async (dispatch, getState) => {
    const state = getState();
    const progress = Progress_getProgressById(state, id);
    const isCurrent = progress ? Progress_isCurrent(progress) : false;
    const { navigateTo, goBack } = await getNavigationService();
    // Navigate before dispatch so the progress screen unmounts before
    // FallbackScreen can detect null progress and redirect to home.
    // The dispatch must stay synchronous after goBack: for a dirty past workout
    // useConfirmScreenLeave intercepts the goBack, and Thunk_confirmScreenLeave's
    // one-tick defer needs the save committed by then to proceed without a dialog.
    // ScreenRemovalCleanup's "state" event also fires post-commit, so the save
    // lands before the removed screen's edit state gets cleaned up.
    if (isCurrent) {
      navigateTo("finishDay", progress ? { id: progress.startTime } : undefined, { tab: "workout" });
    } else {
      goBack();
    }
    dispatch({ type: "FinishProgramDayAction", id });
  };
}

export function Thunk_deleteProgress(id: number): IThunk {
  return async (dispatch) => {
    dispatch({ type: "DeleteProgress", id });
    const { navigateTo } = await getNavigationService();
    navigateTo("main", undefined, { tab: "home" });
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
      Dialog_alert("Couldn't fetch program revisions");
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
    Dialog_alert("Link copied to clipboard:\n\n" + link);
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
      text += PlannerProgram_generateFullText(program.planner.weeks);
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
      Dialog_alert("Couldn't parse the provided file");
      return;
    }
    const result = Storage_get(parsedMaybeStorage, false);
    if (result.success) {
      updateState(dispatch, [lb<IState>().p("storage").record(result.data)], "Importing Storage");
      Dialog_alert("Successfully imported");
    } else {
      Dialog_alert(`Couldn't import the storage, errors: \n${result.error.join("\n")}`);
    }
  };
}

// Parsing a large CSV blocks the JS thread, so show the navbar spinner while it runs. The yield lets
// the spinner paint before the synchronous parse starts (otherwise it wouldn't render until parsing
// finishes). This does NOT use `load()` - that retries up to 3x, which would re-parse a bad file.
async function importWithSpinner<T>(dispatch: IDispatch, cb: () => T): Promise<T> {
  const name = UidFactory_generateUid(4);
  updateState(
    dispatch,
    [lb<IState>().p("loading").p("items").p(name).record({ startTime: Date.now(), type: "Importing" })],
    "Start import parse"
  );
  try {
    await new Promise((resolve) => setTimeout(resolve, 16));
    return cb();
  } finally {
    updateState(
      dispatch,
      [lb<IState>().p("loading").p("items").pi(name).p("endTime").record(Date.now())],
      "End import parse"
    );
  }
}

export function Thunk_importCsvData(rawCsv: string): IThunk {
  return async (dispatch, getState, env) => {
    try {
      dispatch(Thunk_postevent("import-csv-data"));
      const result = await importWithSpinner(dispatch, () =>
        ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords(rawCsv, getState().storage.settings)
      );
      if (result.historyRecords.length === 0) {
        Dialog_alert("No workouts found in the file.");
        return;
      }
      updateState(
        dispatch,
        [lb<IState>().p("importPreview").record({ source: "liftosaurCsv", result })],
        "Open import preview"
      );
      dispatch(Thunk_pushScreen("importPreview"));
    } catch (e) {
      if (e instanceof ImportFileError) {
        Dialog_alert(e.message);
      } else {
        console.error(e);
        Dialog_alert("Couldn't parse the provided file");
      }
    }
  };
}

export function Thunk_importHevyData(rawCsv: string): IThunk {
  return async (dispatch, getState) => {
    try {
      dispatch(Thunk_postevent("import-hevy-data"));
      const result = await importWithSpinner(dispatch, () =>
        ImportFromHevy_convertHevyCsvToHistoryRecords(rawCsv, getState().storage.settings)
      );
      if (result.historyRecords.length === 0) {
        Dialog_alert("No workouts found in the file.");
        return;
      }
      updateState(
        dispatch,
        [lb<IState>().p("importPreview").record({ source: "hevy", result })],
        "Open import preview"
      );
      dispatch(Thunk_pushScreen("importPreview"));
    } catch (e) {
      if (e instanceof ImportFileError) {
        Dialog_alert(e.message);
      } else {
        console.error(e);
        Rollbar.error(e as Error);
        Dialog_alert("Failed to import history from Hevy.");
      }
    }
  };
}

export function Thunk_undoImport(sessionId: string): IThunk {
  return async (dispatch, getState) => {
    const storage = getState().storage;
    const session = (storage.importSessions ?? []).find((s) => s.id === sessionId);
    if (session == null) {
      return;
    }
    const editedCount = ImportSession_findEditedRecordIds(storage, session).length;
    const editedWarning = editedCount > 0 ? ` ${editedCount} of them were edited after the import.` : "";
    const sourceName = session.source === "hevy" ? "Hevy" : "CSV";
    if (
      !(await Dialog_confirm(
        `Remove ${session.workoutCount} ${StringUtils_pluralize("workout", session.workoutCount)} imported from ${sourceName} on ${DateUtils_format(session.timestamp)}?${editedWarning}`
      ))
    ) {
      return;
    }
    const undone = ImportSession_undo(getState().storage, sessionId);
    if (undone != null) {
      updateState(dispatch, [lb<IState>().p("storage").record(undone)], "Undo import");
    }
  };
}

export function Thunk_applyImport(
  historyRecords: IHistoryRecord[],
  customExercises: Record<string, ICustomExercise>,
  source: IImportSession["source"]
): IThunk {
  return async (dispatch, getState) => {
    const applied = ImportSession_apply(getState().storage, historyRecords, customExercises, source);
    updateState(
      dispatch,
      [
        lb<IState>().p("storage").p("history").record(applied.history),
        lb<IState>().p("storage").p("settings").p("exercises").record(applied.exercises),
        lb<IState>().p("storage").p("importSessions").record(applied.importSessions),
      ],
      `Import history from ${source === "hevy" ? "Hevy" : "CSV"}`
    );
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
      Dialog_alert(data.error.join("\n"));
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
      if (!(await Dialog_confirm(`Do you want to import program ${newProgram.name}?`))) {
        return;
      }
      const hasExistingProgram = getState().storage.programs.some((p) => p.id === newProgram.id);
      if (
        hasExistingProgram &&
        !(await Dialog_confirm("Program with the same id already exists, do you want to overwrite it?"))
      ) {
        return;
      }
      if (newProgram.planner && PlannerProgram_hasNonSelectedWeightUnit(newProgram.planner, state.storage.settings)) {
        const fromUnit = Weight_oppositeUnit(state.storage.settings.units);
        const toUnit = state.storage.settings.units;
        if (await Dialog_confirm(`The program has weights in ${fromUnit}, do you want to convert them to ${toUnit}?`)) {
          newProgram.planner = PlannerProgram_switchToUnit(newProgram.planner, state.storage.settings);
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
          lb<IState>().p("storage").p("currentProgramId").record(newProgram.id),
        ],
        "Importing Program"
      );
      Dialog_alert("Successfully imported");
      const { navigateTo } = await getNavigationService();
      navigateTo("main", undefined, { tab: "home" });
    } else {
      Dialog_alert(result.error.join("\n"));
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
            Dialog_alert(`Error while trying to switch the account: ${result.error}`);
          }
        } else {
          console.error("Error while trying to switch the account: missing account", id);
          Dialog_alert(`Error while trying to switch the account: missing account ${id}`);
        }
      })
    );
  };
}

export function Thunk_adminCheckKey(adminKey: string, cb: (isValid: boolean) => void): IThunk {
  return async (dispatch, getState, env) => {
    const isValid = await load(dispatch, "Validating admin key", () => env.service.checkAdminKey(adminKey));
    cb(isValid);
  };
}

export function Thunk_adminLoginAsUser(userId: string, adminKey: string, storageId?: string): IThunk {
  return async (dispatch, getState, env) => {
    const result = await load(dispatch, "Loading user storage", () =>
      AdminDebug_fetchStorage(env.service, getState().storage.tempUserId, userId, adminKey, storageId)
    );
    if (!result.success) {
      Dialog_alert(`Failed to login as user ${userId}: ${result.error}`);
      return;
    }
    const debugStorage = result.data;
    dispatch(Thunk_postevent("admin-login-as-user"));
    // Sign out the admin's own session so the debug sandbox is fully anonymous: the server
    // never minted a target cookie, and clearing the admin's own cookie means no in-session
    // request can be attributed to anyone. The admin's local account stays in IndexedDB.
    await env.service.signout();
    const localStorage: ILocalStorage = { storage: debugStorage };
    const rawStorage = JSON.stringify(localStorage);
    await IndexedDBUtils_set("current_account", debugStorage.tempUserId);
    await IndexedDBUtils_set(`liftosaur_${debugStorage.tempUserId}`, rawStorage);
    const newState = await getInitialState(env.service.client, { rawStorage, deviceId: getState().deviceId });
    dispatch({ type: "ReplaceState", state: newState });
    dispatch(Thunk_fetchInitial());
    const { navigateTo } = await getNavigationService();
    navigateTo("main", undefined, { tab: "home" });
  };
}

export function Thunk_claimkey(): IThunk {
  return async (dispatch, getState, env) => {
    const claim = await env.service.postClaimKey(getState().storage.tempUserId);
    if (claim) {
      finishFreeAccess(dispatch, claim.key, claim.expires);
    } else {
      Dialog_alert("Failed to claim the free access");
      dispatch(Thunk_log("ls-claim-free-user-fail"));
    }
  };
}

function finishFreeAccess(dispatch: IDispatch, key: string, expires: number): void {
  updateState(dispatch, [lb<IState>().p("storage").p("subscription").p("key").record(key)], "Set subscription key");
  const date = DateUtils_format(expires);
  Dialog_alert(`Successfully claimed the free access until ${date}`);
  dispatch(Thunk_log("ls-claim-free-user-success"));
  dispatch(Thunk_pullScreen());
}

export function Thunk_fetchInitial(): IThunk {
  return async (dispatch, getState, env) => {
    if (getState().storage.whatsNew == null) {
      WhatsNew_updateStorage(dispatch);
    }
    dispatch(Thunk_fetchPrograms());
    // A debug sandbox must not verify the target's subscription receipts or restore IAPs.
    if (AdminDebug_isDebugAccountId(getState().storage.tempUserId)) {
      return;
    }
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
        if (SendMessage_isIos() || Platform.OS === "ios") {
          dispatch(Thunk_restorePurchases());
        }
      } else {
        dispatch(Thunk_postevent("apple-subscription-verified"));
        if (getState().storage.subscription.apple.length === 0) {
          Subscriptions_setAppleReceipt(dispatch, receipt);
        }
      }
    }
    if (SendMessage_isAndroid() || Platform.OS === "android") {
      dispatch(Thunk_restorePurchases());
    }
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
        Dialog_alert("Coupon has been applied! Proceed to purchase now.");
      } else if (googleOffer) {
        console.log("Google promotional offer data:", googleOffer);
        updateState(dispatch, [lb<IState>().p("googleOffer").record(googleOffer)], "Set google promotional offer");
        lg("ls-coupon-applied", { code, type: "google" });
        Dialog_alert("Coupon has been applied! Proceed to purchase now.");
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
          Dialog_alert("You need to sign in first to claim the coupon.");
          break;
        }
        case "coupon_not_found": {
          Dialog_alert("Couldn't find the coupon with that code.");
          break;
        }
        case "coupon_disabled": {
          Dialog_alert("Couldn't find the coupon with that code.");
          break;
        }
        case "coupon_already_claimed": {
          Dialog_alert("This coupon is already claimed.");
          break;
        }
        case "wrong_platform": {
          Dialog_alert("This coupon could only be activated on Android or iOS.");
          break;
        }
        default: {
          Dialog_alert("Failed to claim the coupon.");
          break;
        }
      }
      dispatch(Thunk_log("ls-claim-coupon-fail"));
      cb(false);
    }
  };
}

export function Thunk_setAppleReceipt(receipt?: string, opts?: { keepSubscriptionScreenOpen?: boolean }): IThunk {
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
        // A plan switch re-delivers the existing receipt; closing the screen would hide the freshly-updated
        // pending-switch UI, so keep it open in that case and let the refresh repaint the management state.
        if (env.getCurrentScreenData?.()?.name === "subscription" && !opts?.keepSubscriptionScreenOpen) {
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

export function Thunk_setGooglePurchaseToken(
  productId?: string,
  token?: string,
  opts?: { keepSubscriptionScreenOpen?: boolean }
): IThunk {
  return async (dispatch, getState, env) => {
    if (productId && token) {
      const purchaseToken = JSON.stringify({ productId, token });
      const state = getState();
      const userId = state.user?.id || state.storage.tempUserId;
      if (await Subscriptions_verifyGooglePurchaseToken(env.service, userId, purchaseToken)) {
        dispatch(Thunk_postevent("complete-google-subscription"));
        dispatch(Thunk_log("ls-set-google-purchase-token"));
        Subscriptions_setGooglePurchaseToken(dispatch, purchaseToken);
        // A plan switch re-delivers the existing token; keep the screen open so the updated pending-switch
        // UI stays visible instead of being closed out from under the user.
        if (env.getCurrentScreenData?.()?.name === "subscription" && !opts?.keepSubscriptionScreenOpen) {
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
      if (result.is_new_user) {
        Analytics_trackSignUp();
        if (oldUserId) {
          try {
            await service.postDebug(oldUserId, JSON.stringify(window.state || {}), {
              new_userid: result.user_id,
              email: result.email,
            });
          } catch (e) {
            console.error("Failed to upload debug data for old user", e);
          }
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
        const newState = await getInitialState(client, { storage, deviceId: await DeviceId_get() });
        newState.lastSyncedStorage = ObjectUtils_clone(newState.storage);
        newState.user = { id: result.user_id, email: result.email };
        dispatch({ type: "ReplaceState", state: newState });
      }
      dispatch(Thunk_fetchInitial());
      SendMessage_toIos({ type: "authChanged", userId: result.user_id });
      if (result.session) {
        const auth: IAuthToken = {
          token: result.session,
          expiresAt: Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 60 * 60,
          userId: result.user_id,
        };
        try {
          await KeychainStore_setAuthToken(auth);
        } catch (e) {
          lg("ls-keychain-set-auth-fail", { error: e instanceof Error ? e.message : String(e) });
        }
        NativeWatchBridge_sendAuthToWatch(auth);
      }
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

interface IIapSubscribeArgs {
  applePromo?: IApplePromotionalOffer;
  googlePromo?: IGooglePromotionalOffer;
}

function buildSubscribeThunk(
  loadingKey: keyof ISubscriptionLoading,
  messageType: "subscribeMontly" | "subscribeYearly",
  sku: string,
  args?: IIapSubscribeArgs
): IThunk {
  return async (dispatch, getState, env) => {
    IapHelpers_setLoading(dispatch, getState, { [loadingKey]: true } as ISubscriptionLoading);
    if (env.iap) {
      const owned = await env.iap.getAvailablePurchases();
      if (owned.length > 0) {
        IapHelpers_alertAlreadySubscribed();
        IapHelpers_clearLoading(dispatch);
        return;
      }
      try {
        await env.iap.requestSubscription({
          sku,
          applePromo: IapHelpers_applePromoToAdapter(args?.applePromo),
          googleOfferId: args?.googlePromo?.offerId,
        });
      } catch (e) {
        IapHelpers_clearLoading(dispatch);
        console.warn("IAP requestSubscription failed", e);
      }
    } else {
      SendMessage_toIos({ type: messageType, offer: JSON.stringify(args?.applePromo) });
      SendMessage_toAndroid({ type: messageType, offer: JSON.stringify(args?.googlePromo) });
    }
  };
}

export function Thunk_subscribeMonthly(args?: IIapSubscribeArgs): IThunk {
  return buildSubscribeThunk("monthly", "subscribeMontly", IapHelpers_getSkus().monthly, args);
}

export function Thunk_subscribeYearly(args?: IIapSubscribeArgs): IThunk {
  return buildSubscribeThunk("yearly", "subscribeYearly", IapHelpers_getSkus().yearly, args);
}

export function Thunk_buyLifetime(): IThunk {
  return async (dispatch, getState, env) => {
    IapHelpers_setLoading(dispatch, getState, { lifetime: true });
    if (env.iap) {
      const owned = await env.iap.getAvailablePurchases();
      if (owned.length > 0) {
        IapHelpers_alertAlreadySubscribed();
        IapHelpers_clearLoading(dispatch);
        return;
      }
      try {
        await env.iap.requestInAppProduct({ sku: IapHelpers_getSkus().lifetime });
      } catch (e) {
        IapHelpers_clearLoading(dispatch);
        console.warn("IAP requestInAppProduct failed", e);
      }
    } else {
      SendMessage_toIos({ type: "subscribeLifetime" });
      SendMessage_toAndroid({ type: "subscribeLifetime" });
    }
  };
}

export function Thunk_restorePurchases(args?: { interactive?: boolean }): IThunk {
  return async (dispatch, _getState, env) => {
    const interactive = args?.interactive ?? false;
    if (env.iap) {
      try {
        const purchases = await env.iap.getAvailablePurchases();
        if (purchases.length === 0) {
          if (interactive) {
            Dialog_alert("No active purchases to restore.");
          }
          return;
        }
        if (Platform.OS === "ios") {
          const receipt = await IapHelpers_readReceiptOrJwsIOS(env.iap, purchases[0]);
          if (receipt) {
            dispatch(Thunk_setAppleReceipt(receipt));
          }
        } else {
          for (const purchase of purchases) {
            if (purchase.purchaseToken && purchase.productId) {
              dispatch(Thunk_setGooglePurchaseToken(purchase.productId, purchase.purchaseToken));
            }
          }
        }
      } catch (e) {
        console.warn("IAP restorePurchases failed", e);
        if (interactive) {
          Dialog_alert("Couldn't restore purchases. Please try again later.");
        }
      }
    } else {
      SendMessage_toIos({ type: "restoreSubscriptions" });
      SendMessage_toAndroid({ type: "restoreSubscriptions" });
    }
  };
}

export function Thunk_iapHandlePurchase(purchase: IIapPurchase): IThunk {
  return async (dispatch, _getState, env) => {
    if (!env.iap) {
      return;
    }
    try {
      const keepScreen = { keepSubscriptionScreenOpen: !!purchase.renewsAsProductId };
      if (Platform.OS === "ios") {
        const receipt = await IapHelpers_readReceiptOrJwsIOS(env.iap, purchase);
        if (receipt) {
          dispatch(Thunk_setAppleReceipt(receipt, keepScreen));
        } else {
          console.warn("IAP: no receipt obtained for purchase, server will not be notified");
        }
      } else {
        if (purchase.purchaseToken && purchase.productId) {
          dispatch(Thunk_setGooglePurchaseToken(purchase.productId, purchase.purchaseToken, keepScreen));
        }
      }
      // A queued plan switch re-delivers the existing transaction (renewsAsProductId set); it's not a
      // new purchase, so don't double-count it as one.
      if (!purchase.renewsAsProductId) {
        Analytics_trackPurchase({
          productId: purchase.productId,
          price: purchase.price ?? 0,
          currency: purchase.currency || "USD",
          transactionId: purchase.transactionId ?? purchase.id,
          transactionDate: purchase.transactionDate,
        });
      }
    } finally {
      try {
        await env.iap.finishTransaction(purchase);
      } catch (e) {
        console.warn("IAP finishTransaction failed", e);
      }
      IapHelpers_clearLoading(dispatch);
      // Refresh so a plan switch (or its cancellation) reflects in subscriptionStatus.pendingProductId
      // right away, instead of only after the screen re-mounts.
      dispatch(Thunk_iapRefreshActiveSubscriptions());
    }
  };
}

export function Thunk_iapHandlePurchaseError(error: IIapPurchaseError): IThunk {
  return async (dispatch) => {
    console.warn("IAP purchase error", error);
    IapHelpers_clearLoading(dispatch);
  };
}

// Android's Google Play billing sheet (especially for in-app products) doesn't reliably emit a
// purchaseError event when the user dismisses it without buying, so the plan-card spinner would
// otherwise hang until the safety timeout. A real purchase clears its own loading via
// Thunk_iapHandlePurchase, so by the time the app has been back in the foreground for a moment any
// still-set loading means the sheet was dismissed.
export function Thunk_iapClearStuckLoadingOnForeground(): IThunk {
  return async (dispatch, getState) => {
    if (Platform.OS !== "android") {
      return;
    }
    if (getState().subscriptionLoading != null) {
      IapHelpers_clearLoading(dispatch);
    }
  };
}

export function Thunk_redeemCouponIOS(): IThunk {
  return async (_dispatch, _getState, env) => {
    if (!env.iap) {
      return;
    }
    try {
      await env.iap.presentCodeRedemptionSheetIOS();
    } catch (e) {
      console.warn("IAP presentCodeRedemptionSheetIOS failed", e);
    }
  };
}

export function Thunk_iapFetchProducts(): IThunk {
  return async (dispatch, _getState, env) => {
    if (!env.iap) {
      return;
    }
    try {
      const skus = IapHelpers_getSkus();
      const subs = await env.iap.fetchSubscriptions([skus.monthly, skus.yearly]);
      const inApp = await env.iap.fetchInAppProducts([skus.lifetime]);
      const newPrices: Record<string, string> = {};
      const newOffers: Record<string, IOfferData[]> = {};
      for (const sub of subs) {
        newPrices[sub.id] = sub.displayPrice;
        const mapped: IOfferData[] = sub.subscriptionOffers
          .filter((o) => !!o.id)
          .map((o) => ({ offerId: o.id, formattedPrice: o.displayPrice }));
        if (mapped.length > 0) {
          newOffers[sub.id] = mapped;
        }
      }
      for (const product of inApp) {
        newPrices[product.id] = product.displayPrice;
      }
      updateState(
        dispatch,
        [
          lb<IState>()
            .p("prices")
            .recordModify((v) => ({ ...(v ?? {}), ...newPrices })),
          lb<IState>()
            .p("offers")
            .recordModify((v) => ({ ...(v ?? {}), ...newOffers })),
        ],
        "Update prices for products"
      );
    } catch (e) {
      console.warn("IAP fetchProducts failed", e);
    }
  };
}

// How long the optimistic Android plan-switch hint survives before deferring to the server. Generous
// enough to cover Google's deferred RTDN propagation; the hint also clears as soon as the server reports.
const SUBSCRIPTION_PENDING_HINT_MS = 1 * 60 * 1000;

export function Thunk_iapRefreshActiveSubscriptions(): IThunk {
  return async (dispatch, getState, env) => {
    if (!env.iap) {
      return;
    }
    updateState(
      dispatch,
      [lb<IState>().p("subscriptionStatusLoading").record(true)],
      "Start subscription status loading"
    );
    try {
      const [subs, owned] = await Promise.all([env.iap.getActiveSubscriptions(), env.iap.getAvailablePurchases()]);
      const lifetimeSku = IapHelpers_getSkus().lifetime;
      const ownedLifetime = owned.some((p) => p.productId === lifetimeSku);
      let patchedSubs = subs;
      let serverPending: string | undefined;
      // Android exposes neither the subscription expiry nor a queued plan switch client-side, so fill
      // both from the server's verified subscriptionsv2 record (iOS already has them from StoreKit).
      // `pendingProduct` comes from Google's `deferredItemReplacement` and is authoritative: when the
      // switch is cancelled in Play or has landed, the server drops it and the pending card clears.
      if (Platform.OS === "android" && subs.some((s) => s.isActive)) {
        try {
          // Re-verify the live purchase token to get the server's freshly-derived status (incl. a queued
          // `deferredItemReplacement` plan switch), so it surfaces immediately instead of waiting on Google's
          // laggy SUBSCRIPTION_DEFERRED RTDN. Authorized by the purchase token, not a userId lookup.
          const state = getState();
          const userId = state.user?.id || state.storage.tempUserId;
          const activeStoreSub = subs.find((s) => s.isActive && !!s.purchaseTokenAndroid);
          if (activeStoreSub?.purchaseTokenAndroid) {
            const purchaseToken = JSON.stringify({
              productId: activeStoreSub.productId,
              token: activeStoreSub.purchaseTokenAndroid,
            });
            const sub = await env.service.refreshGoogleSubscription(userId, purchaseToken);
            if (sub) {
              serverPending = sub.pendingProduct;
              patchedSubs = subs.map((s) =>
                s.isActive ? { ...s, expirationDate: s.expirationDate ?? sub.expires } : s
              );
            }
          }
        } catch (e) {
          console.warn("IAP refreshGoogleSubscription failed", e);
        }
      }
      // The server's pendingProduct is authoritative once present; until Google's deferred RTDN lands,
      // a fresh non-expired optimistic hint bridges the gap. Drop the hint when the server takes over,
      // it expires, or the switch has landed (active product already equals the hint).
      const hint = getState().subscriptionPendingHint;
      const hintValid =
        hint != null &&
        Date.now() < hint.until &&
        !patchedSubs.some((s) => s.isActive && s.productId === hint.productId);
      const keepHint = hintValid && serverPending == null;
      const effectivePending = serverPending ?? (hintValid ? hint?.productId : undefined);
      if (effectivePending != null) {
        patchedSubs = patchedSubs.map((s) => (s.isActive ? { ...s, pendingProductId: effectivePending } : s));
      }
      updateState(
        dispatch,
        [
          lb<IState>().p("subscriptionStatus").record(patchedSubs),
          lb<IState>().p("ownedLifetime").record(ownedLifetime),
          ...(keepHint ? [] : [lb<IState>().p("subscriptionPendingHint").record(undefined)]),
        ],
        "Update active subscriptions"
      );
    } catch (e) {
      console.warn("IAP getActiveSubscriptions failed", e);
    } finally {
      updateState(
        dispatch,
        [lb<IState>().p("subscriptionStatusLoading").record(undefined)],
        "Stop subscription status loading"
      );
    }
  };
}

export function Thunk_switchSubscription(target: "monthly" | "yearly"): IThunk {
  return async (dispatch, getState, env) => {
    const sku = target === "monthly" ? IapHelpers_getSkus().monthly : IapHelpers_getSkus().yearly;
    IapHelpers_setLoading(dispatch, getState, { [target]: true } as ISubscriptionLoading);
    if (!env.iap) {
      IapHelpers_clearLoading(dispatch);
      return;
    }
    try {
      if (Platform.OS === "ios") {
        // StoreKit applies the subscription group's upgrade/downgrade rules automatically,
        // so a switch is just a normal purchase of the target sku. Deliberately skips the
        // already-subscribed guard that the initial-purchase thunks use.
        await env.iap.requestSubscription({ sku });
      } else {
        let active = getState().subscriptionStatus ?? [];
        if (active.length === 0) {
          active = await env.iap.getActiveSubscriptions();
        }
        const current = active.find((s) => s.isActive && !!s.purchaseTokenAndroid);
        if (!current?.purchaseTokenAndroid) {
          IapHelpers_clearLoading(dispatch);
          Dialog_alert("Couldn't find your active subscription to switch. Please try again.");
          return;
        }
        // monthly→yearly defers to the next billing cycle (short wait, no wasted paid time);
        // yearly→monthly prorates immediately (a year is too long to wait).
        const isDeferred = target === "yearly";
        await env.iap.requestSubscription({
          sku,
          androidOldPurchaseToken: current.purchaseTokenAndroid,
          androidOldProductId: current.productId,
          androidReplacementMode: isDeferred ? "deferred" : "with-time-proration",
        });
        // Android plan changes don't reliably emit a purchase event, so clear the spinner here. The
        // pending "Switching to…" state is read authoritatively from the server (subscriptionsv2
        // `deferredItemReplacement`) on refresh, but that lags behind Google's deferred RTDN — so set a
        // short-lived, non-synced optimistic hint to show the card immediately. The refresh reconciles it
        // against the server and drops it once the server is authoritative (or after it expires).
        if (isDeferred) {
          updateState(
            dispatch,
            [
              lb<IState>()
                .p("subscriptionPendingHint")
                .record({ productId: sku, until: Date.now() + SUBSCRIPTION_PENDING_HINT_MS }),
            ],
            "Optimistic pending subscription switch"
          );
        }
        IapHelpers_clearLoading(dispatch);
        dispatch(Thunk_iapRefreshActiveSubscriptions());
      }
    } catch (e) {
      IapHelpers_clearLoading(dispatch);
      console.warn("IAP switchSubscription failed", e);
    }
  };
}

export function Thunk_openManageSubscriptions(): IThunk {
  return async (_dispatch, _getState, env) => {
    if (!env.iap) {
      Dialog_alert("Manage your subscription from your App Store / Play Store account settings.");
      return;
    }
    try {
      await env.iap.openManageSubscriptions();
    } catch (e) {
      console.warn("IAP openManageSubscriptions failed", e);
    }
  };
}
