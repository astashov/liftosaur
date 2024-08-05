import { IThunk, IDispatch } from "./types";
import { IScreen } from "../models/screen";
import RB from "rollbar";
import { IGetStorageResponse, IPostSyncResponse, Service } from "../api/service";
import { lb } from "lens-shmens";
import { Program } from "../models/program";
import { getGoogleAccessToken } from "../utils/googleAccessToken";
import { IEnv, IState, updateState } from "../models/state";
import { IProgram, IStorage, IExerciseType, ISettings } from "../types";
import { CollectionUtils } from "../utils/collection";
import { ImportExporter } from "../lib/importexporter";
import { Storage } from "../models/storage";
import { History } from "../models/history";
import { CSV } from "../utils/csv";
import { Exporter } from "../utils/exporter";
import { DateUtils } from "../utils/date";
import { getInitialState } from "./reducer";
import { IndexedDBUtils } from "../utils/indexeddb";
import { WhatsNew } from "../models/whatsnew";
import { Screen } from "../models/screen";
import { Subscriptions } from "../utils/subscriptions";
import { SendMessage } from "../utils/sendMessage";
import { UidFactory } from "../utils/generator";
import { ClipboardUtils } from "../utils/clipboard";
import { Progress } from "../models/progress";
import { ImportFromLink } from "../utils/importFromLink";
import { getLatestMigrationVersion } from "../migrations/migrations";
import { LogUtils } from "../utils/log";
import { RollbarUtils } from "../utils/rollbar";
import { UrlUtils } from "../utils/url";
import { ImportFromLiftosaur } from "../utils/importFromLiftosaur";
import { Sync } from "../utils/sync";
import { ObjectUtils } from "../utils/object";

declare let Rollbar: RB;

export class NoRetryError extends Error {
  public noretry = true;
}

export namespace Thunk {
  export function googleSignIn(): IThunk {
    return async (dispatch, getState, env) => {
      const url = UrlUtils.build(window.location.href);
      const forcedUserEmail = url.searchParams.get("forceuseremail");
      if (forcedUserEmail == null) {
        const accessToken = await getGoogleAccessToken();
        if (accessToken != null) {
          const state = getState();
          const userId = state.user?.id || state.storage.tempUserId;
          const result = await load(dispatch, "Logging in", async () =>
            env.service.googleSignIn(accessToken, userId, {})
          );
          await load(dispatch, "Logging in", () => handleLogin(dispatch, result, env.service.client, userId));
          dispatch(sync2());
        }
      } else {
        const state = getState();
        const userId = state.user?.id || state.storage.tempUserId;
        const result = await env.service.googleSignIn("test", userId, { forcedUserEmail });
        await load(dispatch, "Logging in", () => handleLogin(dispatch, result, env.service.client, userId));
        dispatch(sync2());
      }
    };
  }

  export function appleSignIn(): IThunk {
    return async (dispatch, getState, env) => {
      let id_token: string;
      let code: string;
      if (SendMessage.isIos()) {
        const result = await SendMessage.toIosWithResult<{ id_token: string; code: string } | { error: string }>({
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
        const response = await window.AppleID.auth.signIn();
        ({ id_token, code } = response.authorization);
      }
      if (id_token != null && code != null) {
        const state = getState();
        const userId = state.user?.id || state.storage.tempUserId;
        const result = await load(dispatch, "Logging in", async () => env.service.appleSignIn(code, id_token, userId));
        await load(dispatch, "Logging in", () => handleLogin(dispatch, result, env.service.client, userId));
        dispatch(sync2());
      }
    };
  }

  export function log(action: string): IThunk {
    return async (dispatch, getState, env) => {
      const state = getState();
      if (!state.nosync) {
        LogUtils.log(
          state.user?.id || state.storage.tempUserId,
          action,
          state.storage.affiliates,
          Subscriptions.listOfSubscriptions(state.storage.subscription),
          () => {
            updateState(dispatch, [lb<IState>().p("storage").p("subscription").p("key").record(undefined)]);
          },
          state.storage.subscription.key,
          state.storage.referrer
        );
      }
    };
  }

  export function logOut(cb?: () => void): IThunk {
    return async (dispatch, getState, env) => {
      if (getState().user?.id) {
        await env.service.signout();
        dispatch({ type: "Logout" });
        updateState(dispatch, [lb<IState>().p("lastSyncedStorage").record(undefined)]);
      }
      if (cb) {
        cb();
      }
    };
  }

  export function postDebug(): IThunk {
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
    args?: { force: boolean }
  ): Promise<void> {
    const state = getState();
    function handleResponse(result: IPostSyncResponse, lastSyncedStorage?: IStorage): boolean {
      if (result.type === "clean") {
        updateState(dispatch, [
          lb<IState>()
            .p("lastSyncedStorage")
            .record(lastSyncedStorage || getState().lastSyncedStorage),
          lb<IState>().pi("lastSyncedStorage").p("originalId").record(result.new_original_id),
          lb<IState>().p("storage").p("originalId").record(result.new_original_id),
          lb<IState>().p("storage").p("subscription").p("key").record(result.key),
        ]);
        if (getState().storage.email !== result.email || getState().user?.id !== result.user_id) {
          dispatch({ type: "Login", email: result.email, userId: result.user_id });
        }
        return true;
      } else if (result.type === "dirty") {
        updateState(dispatch, [
          lb<IState>().p("lastSyncedStorage").record(result.storage),
          lb<IState>().p("storage").record(result.storage),
          lb<IState>().p("storage").p("subscription").p("key").record(result.key),
        ]);
        if (getState().storage.email !== result.email || getState().user?.id !== result.user_id) {
          dispatch({ type: "Login", email: result.email, userId: result.user_id });
        }
        return true;
      } else if (result.type === "error" && result.error === "not_authorized") {
        updateState(dispatch, [
          lb<IState>().p("storage").p("subscription").p("key").record(result.key),
          lb<IState>().p("lastSyncedStorage").record(undefined),
        ]);
        return false;
      } else if (result.type === "error") {
        throw new NoRetryError(result.error);
      }
      return false;
    }
    if (state.lastSyncedStorage == null) {
      const result = await env.service.postSync({
        tempUserId: state.storage.tempUserId,
        storageUpdate: {
          settings: {},
          version: state.storage.version,
        },
      });
      const handled = handleResponse(result);
      if (handled) {
        await _sync2(dispatch, getState, env, args);
      }
    } else {
      const storageUpdate = Sync.getStorageUpdate(state.storage, state.lastSyncedStorage);
      const { settings, originalId, version, ...rest } = storageUpdate;
      const lastSyncedStorage = state.storage;
      if (args?.force || Object.keys(rest).length > 0 || Object.keys(settings || {}).length > 0) {
        const result = await env.service.postSync({
          tempUserId: state.storage.tempUserId,
          storageUpdate: storageUpdate,
        });
        handleResponse(result, lastSyncedStorage);
      }
    }
  }

  export function sync2(args?: { force: boolean; cb?: () => void }): IThunk {
    return async (dispatch, getState, env) => {
      try {
        const state = getState();
        if (
          state.errors.corruptedstorage == null &&
          state.adminKey == null &&
          !state.nosync &&
          (state.user != null || args?.force)
        ) {
          await env.queue.enqueue(
            async (args2) => {
              await load(dispatch, "Sync", async () => {
                await _sync2(dispatch, getState, env, args2);
              });
            },
            { force: !!args?.force }
          );
        }
      } finally {
        if (args?.cb) {
          args.cb();
        }
      }
    };
  }

  export function cloneAndSelectProgram(id: string): IThunk {
    return async (dispatch, getState, env) => {
      const program = CollectionUtils.findBy(getState().programs, "id", id);
      if (program != null) {
        Program.cloneProgram(dispatch, program);
        const clonedProgram = CollectionUtils.findBy(getState().storage.programs, "id", id);
        if (clonedProgram) {
          updateState(dispatch, [lb<IState>().p("screenStack").record([])]);
          Program.selectProgram(dispatch, clonedProgram.id);
          dispatch({ type: "StartProgramDayAction" });
        }
      }
    };
  }

  export function playAudioNotification(): IThunk {
    return async (dispatch, getState, env) => {
      if (getState().adminKey == null) {
        const settings = getState().storage.settings;
        env.audio.play(settings.volume, !!settings.vibration);
      }
    };
  }

  export function fetchStorage(): IThunk {
    return async (dispatch, getState, env) => {
      if (getState().errors.corruptedstorage == null) {
        const result = await load(dispatch, "Loading from cloud", () => {
          const state = getState();
          const url = typeof window !== "undefined" ? UrlUtils.build(window.location.href) : undefined;
          const userId = url != null ? url.searchParams.get("userid") : state.user?.id;
          return env.service.getStorage(state.storage.tempUserId, userId || undefined, state.adminKey);
        });
        await handleLogin(dispatch, result, env.service.client, getState().user?.id || getState().storage.tempUserId);
      }
    };
  }

  export function pushToEditProgram(): IThunk {
    return async (dispatch, getState) => {
      const state = getState();
      const currentProgram =
        state.storage.currentProgramId != null ? Program.getProgram(state, state.storage.currentProgramId) : undefined;
      if (currentProgram) {
        Program.editAction(dispatch, currentProgram.id);
      }
    };
  }

  export function pushScreen(screen: IScreen): IThunk {
    return async (dispatch, getState) => {
      const confirmation = Screen.shouldConfirmNavigation(getState());
      if (confirmation) {
        if (confirm(confirmation)) {
          cleanup(dispatch, getState());
          dispatch({ type: "PullScreen" });
        } else {
          return;
        }
      }
      if (
        ["musclesProgram", "musclesDay", "graphs"].indexOf(screen) !== -1 &&
        !Subscriptions.hasSubscription(getState().storage.subscription)
      ) {
        screen = "subscription";
      }
      dispatch({ type: "PushScreen", screen });
      window.scroll(0, 0);
    };
  }

  export function maybeRequestReview(): IThunk {
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
          SendMessage.toIos({ type: "requestReview" });
          SendMessage.toAndroid({ type: "requestReview" });
        }
      } catch (e) {
        Rollbar.error(e);
      }
    };
  }

  export function maybeRequestSignup(): IThunk {
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
          updateState(dispatch, [lb<IState>().p("showSignupRequest").record(true)]);
        }
      } catch (e) {
        Rollbar.error(e);
      }
    };
  }

  function cleanup(dispatch: IDispatch, state: IState): void {
    if (state.currentHistoryRecord) {
      const progress = state.progress[state.currentHistoryRecord];
      if (progress && !Progress.isCurrent(progress)) {
        updateState(dispatch, [
          lb<IState>().p("currentHistoryRecord").record(undefined),
          lb<IState>()
            .p("progress")
            .recordModify((progresses) => Progress.stop(progresses, progress.id)),
        ]);
      }
    }

    const editExercise = state.editExercise;
    if (editExercise) {
      updateState(dispatch, [lb<IState>().p("editExercise").record(undefined)]);
    }
  }

  export function pullScreen(): IThunk {
    return async (dispatch, getState) => {
      const confirmation = Screen.shouldConfirmNavigation(getState());
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

  export function publishProgram(
    args: Pick<IProgram, "id" | "author" | "name" | "shortDescription" | "description" | "url">
  ): IThunk {
    const { id, author, name, description, shortDescription, url } = args;
    return async (dispatch, getState, env) => {
      const state = getState();
      const program = {
        ...Program.getEditingProgram(state)!,
        id,
        author,
        name,
        description,
        shortDescription,
        url,
      };
      if (state.adminKey) {
        await env.service.publishProgram(program, state.adminKey);
        alert("Published");
      }
    };
  }

  export function fetchPrograms(): IThunk {
    return async (dispatch, getState, env) => {
      const programs = await load(dispatch, "Loading programs", () => env.service.programs());
      dispatch({
        type: "UpdateState",
        lensRecording: [lb<IState>().p("programs").record(programs)],
        desc: "Set loaded Programs",
      });
    };
  }

  export function exportStorage(): IThunk {
    return async (dispatch, getState, env) => {
      ImportExporter.exportStorage(getState().storage);
    };
  }

  export function exportProgramToFile(program: IProgram): IThunk {
    return async (dispatch, getState, env) => {
      const state = getState();
      Program.exportProgramToFile(program, state.storage.settings, state.storage.version);
    };
  }

  export function exportProgramToLink(program: IProgram): IThunk {
    return async (dispatch, getState, env) => {
      const state = getState();
      const link = await Program.exportProgramToLink(program, state.storage.settings, state.storage.version);
      await ClipboardUtils.copy(link);
      alert("Link copied to clipboard:\n\n" + link);
    };
  }

  export function exportHistoryToCSV(): IThunk {
    return async (dispatch, getState, env) => {
      const state = getState();
      const csv = CSV.toString(History.exportAsCSV(state.storage.history, state.storage.settings));
      Exporter.toFile(`liftosaur_${DateUtils.formatYYYYMMDD(Date.now())}.csv`, csv);
    };
  }

  export function importStorage(maybeStorage: string): IThunk {
    return async (dispatch, getState, env) => {
      let parsedMaybeStorage: Record<string, unknown>;
      try {
        parsedMaybeStorage = JSON.parse(maybeStorage);
      } catch (e) {
        alert("Couldn't parse the provided file");
        return;
      }
      const result = await Storage.get(env.service.client, parsedMaybeStorage, false);
      if (result.success) {
        updateState(dispatch, [lb<IState>().p("storage").record(result.data)], "Importing Storage");
        alert("Successfully imported");
      } else {
        alert(`Couldn't import the storage, errors: \n${result.error.join("\n")}`);
      }
    };
  }

  export function importCsvData(rawCsv: string): IThunk {
    return async (dispatch, getState, env) => {
      try {
        const { historyRecords, customExercises } = ImportFromLiftosaur.convertLiftosaurCsvToHistoryRecords(
          rawCsv,
          getState().storage.settings
        );
        updateState(dispatch, [
          lb<IState>()
            .p("storage")
            .p("history")
            .recordModify((oldHistoryRecords) => {
              return CollectionUtils.sortBy(
                CollectionUtils.uniqBy(oldHistoryRecords.concat(historyRecords), "id"),
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
        ]);
      } catch (e) {
        console.error(e);
        alert("Couldn't parse the provided file");
      }
    };
  }

  export function importFromLink(link: string): IThunk {
    return async (dispatch, getState, env) => {
      const data = await ImportFromLink.importFromLink(link, env.service.client);
      if (data.success) {
        Storage.setAffiliate(dispatch, data.data.source);
        dispatch(Thunk.importProgram(data.data.decoded));
      } else {
        alert(data.error.join("\n"));
      }
    };
  }

  export function generateAndCopyLink(editProgram: IProgram, settings: ISettings, cb: (link: string) => void): IThunk {
    return async (dispatch, getState, env) => {
      const link = await Program.exportProgramToLink(editProgram, settings, getLatestMigrationVersion());
      try {
        const service = new Service(env.service.client);
        const url = await service.postShortUrl(link, "p");
        ClipboardUtils.copy(url);
        cb(url);
      } catch (e) {
        Rollbar.error(e);
        ClipboardUtils.copy(link);
        cb(link);
      }
    };
  }

  export function importProgram(maybeProgram: string): IThunk {
    return async (dispatch, getState, env) => {
      const state = getState();
      const result = await ImportExporter.getExportedProgram(env.service.client, maybeProgram, state.storage.settings);
      if (result.success) {
        const { program, customExercises } = result.data;
        const newProgram: IProgram = { ...program, clonedAt: Date.now() };
        if (!confirm(`Do you want to import program ${newProgram.name}?`)) {
          return;
        }
        const hasExistingProgram = getState().storage.programs.some((p) => p.id === newProgram.id);
        if (hasExistingProgram && !confirm("Program with the same id already exists, do you want to overwrite it?")) {
          return;
        }
        updateState(
          dispatch,
          [
            lb<IState>()
              .p("storage")
              .p("settings")
              .p("exercises")
              .recordModify((e) => ({ ...e, ...customExercises })),
            lb<IState>()
              .p("storage")
              .p("programs")
              .recordModify((programs) => {
                const index = programs.findIndex((p) => p.id === newProgram.id);
                if (index !== -1) {
                  return CollectionUtils.setAt(programs, index, newProgram);
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

  export function createAccount(): IThunk {
    return async (dispatch, getState, env) => {
      dispatch(
        Thunk.logOut(async () => {
          const newState = await getInitialState(env.service.client);
          dispatch({ type: "ReplaceState", state: newState });
          dispatch(Thunk.fetchInitial());
        })
      );
    };
  }

  export function deleteAccount(id: string, cb?: () => void): IThunk {
    return async (dispatch, getState, env) => {
      await IndexedDBUtils.remove(`liftosaur_${id}`);
      if (cb) {
        cb();
      }
    };
  }

  export function deleteAccountRemote(cb?: (result: boolean) => void): IThunk {
    return async (dispatch, getState, env) => {
      await load(dispatch, "Delete cloud account", () => {
        return new Promise(async (resolve) => {
          const result = await env.service.deleteAccount();
          dispatch(
            Thunk.logOut(() => {
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

  export function switchAccount(id: string): IThunk {
    return async (dispatch, getState, env) => {
      dispatch(
        Thunk.logOut(async () => {
          const rawStorage = (await IndexedDBUtils.get(`liftosaur_${id}`)) as string | undefined;
          if (rawStorage != null) {
            const result = await Storage.get(env.service.client, JSON.parse(rawStorage)?.storage);
            if (result.success) {
              const newState = await getInitialState(env.service.client, { rawStorage });
              dispatch({ type: "ReplaceState", state: newState });
              dispatch(Thunk.fetchInitial());
            } else {
              alert(`Error while trying to switch the account: ${result.error}`);
            }
          } else {
            alert(`Error while trying to switch the account: missing account ${id}`);
          }
        })
      );
    };
  }

  export function claimkey(): IThunk {
    return async (dispatch, getState, env) => {
      const claim = await env.service.postClaimKey(getState().storage.tempUserId);
      if (claim) {
        finishFreeAccess(dispatch, claim.key, claim.expires);
      } else {
        alert("Failed to claim the free access");
        dispatch(log("ls-claim-free-user-fail"));
      }
    };
  }

  function finishFreeAccess(dispatch: IDispatch, key: string, expires: number): void {
    updateState(dispatch, [lb<IState>().p("storage").p("subscription").p("key").record(key)]);
    const date = DateUtils.format(expires);
    alert(`Successfully claimed the free access until ${date}`);
    dispatch(log("ls-claim-free-user-success"));
    dispatch(pullScreen());
  }

  export function fetchInitial(): IThunk {
    return async (dispatch, getState, env) => {
      if (getState().storage.whatsNew == null) {
        WhatsNew.updateStorage(dispatch);
      }
      dispatch(Thunk.fetchPrograms());
      SendMessage.toIos({ type: "restoreSubscriptions" });
      SendMessage.toAndroid({ type: "restoreSubscriptions" });
    };
  }

  export function redeemCoupon(code: string): IThunk {
    return async (dispatch, getState, env) => {
      const result = await load(dispatch, "Claiming coupon", () => env.service.postClaimCoupon(code));
      if (result.success) {
        const { key, expires } = result.data;
        finishFreeAccess(dispatch, key, expires);
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
          case "coupon_already_claimed": {
            alert("This coupon is already claimed.");
            break;
          }
          default: {
            alert("Failed to claim the coupon.");
            break;
          }
        }
        dispatch(log("ls-claim-coupon-fail"));
      }
    };
  }

  export function setAppleReceipt(receipt?: string): IThunk {
    return async (dispatch, getState, env) => {
      if (receipt) {
        if (
          await Subscriptions.verifyAppleReceipt(
            getState().user?.id || getState().storage.tempUserId,
            env.service,
            receipt
          )
        ) {
          dispatch(log("ls-set-apple-receipt"));
          Subscriptions.setAppleReceipt(dispatch, receipt);
          if (Screen.current(getState().screenStack) === "subscription") {
            dispatch(Thunk.pullScreen());
          }
        }
      }
    };
  }

  export function pushExerciseStatsScreen(exerciseType: IExerciseType): IThunk {
    return async (dispatch, getState, env) => {
      updateState(dispatch, [lb<IState>().p("viewExerciseType").record(exerciseType)]);
      dispatch(Thunk.pushScreen("exerciseStats"));
    };
  }

  export function setGooglePurchaseToken(productId?: string, token?: string): IThunk {
    return async (dispatch, getState, env) => {
      if (productId && token) {
        const purchaseToken = JSON.stringify({ productId, token });
        const state = getState();
        const userId = state.user?.id || state.storage.tempUserId;
        if (await Subscriptions.verifyGooglePurchaseToken(env.service, userId, purchaseToken)) {
          dispatch(log("ls-set-google-purchase-token"));
          Subscriptions.setGooglePurchaseToken(dispatch, purchaseToken);
          if (Screen.current(getState().screenStack) === "subscription") {
            dispatch(Thunk.pullScreen());
          }
        }
      }
    };
  }
}

async function load<T>(dispatch: IDispatch, type: string, cb: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const name = UidFactory.generateUid(4);
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
        [lb<IState>().p("loading").p("items").pi(name).p("endTime").record(Date.now())],
        "End loading"
      );
      resolve(r);
    })
    .catch((e) => {
      if (attempt >= 3 || (e instanceof NoRetryError && e.noretry)) {
        updateState(
          dispatch,
          [
            lb<IState>().p("loading").p("items").pi(name).p("error").record(`${type} failed`),
            lb<IState>().p("loading").p("items").pi(name).p("endTime").record(Date.now()),
          ],
          "Failed loading"
        );
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
  if (result.email != null) {
    Rollbar.configure(RollbarUtils.config({ person: { email: result.email, id: result.user_id } }));
    let storage: IStorage;
    const storageResult = await Storage.get(client, result.storage, true);
    const service = new Service(client);
    if (storageResult.success) {
      storage = storageResult.data;
    } else {
      storage = result.storage;
      const userid = result.user_id || result.storage.tempUserId || `missing-${UidFactory.generateUid(8)}`;
      await service.postDebug(userid, JSON.stringify(result.storage), { local: "false" });
    }
    storage.tempUserId = result.user_id;
    storage.email = result.email;
    if (oldUserId === result.user_id) {
      updateState(dispatch, [lb<IState>().p("lastSyncedStorage").record(storage)]);
      dispatch({ type: "Login", email: result.email, userId: result.user_id });
      if (storage.subscription.key !== result.key) {
        updateState(dispatch, [lb<IState>().p("storage").p("subscription").p("key").record(result.key)]);
      }
    } else {
      storage.subscription.key = result.key;
      const newState = await getInitialState(client, { storage });
      newState.lastSyncedStorage = ObjectUtils.clone(newState.storage);
      newState.user = { id: result.user_id, email: result.email };
      dispatch({ type: "ReplaceState", state: newState });
    }
    dispatch(Thunk.fetchInitial());
  } else if (result.key) {
    updateState(dispatch, [lb<IState>().p("storage").p("subscription").p("key").record(result.key)]);
  }
}
