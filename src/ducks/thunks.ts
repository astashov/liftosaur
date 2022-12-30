import { IThunk, IDispatch } from "./types";
import { IScreen } from "../models/screen";
import RB from "rollbar";
import { IGetStorageResponse, Service } from "../api/service";
import { lb } from "lens-shmens";
import { Program, IExportedProgram } from "../models/program";
import { getGoogleAccessToken } from "../utils/googleAccessToken";
import { IAllFriends, IFriendStatus, ILike, IState, updateState } from "../models/state";
import { IProgram, IStorage } from "../types";
import { runMigrations } from "../migrations/runner";
import { IEither } from "../utils/types";
import { ObjectUtils } from "../utils/object";
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

declare let Rollbar: RB;
declare let __ENV__: string;

export namespace Thunk {
  export function googleSignIn(): IThunk {
    return async (dispatch, getState, env) => {
      const url = new URL(window.location.href);
      const forcedUserEmail = url.searchParams.get("forceuseremail");
      if (forcedUserEmail == null) {
        const accessToken = await getGoogleAccessToken();
        if (accessToken != null) {
          const state = getState();
          const userId = state.user?.id || state.storage.tempUserId;
          const result = await load(dispatch, "googleSignIn", () => env.service.googleSignIn(accessToken, userId));
          await load(dispatch, "handleLogin", () => handleLogin(dispatch, result, env.service.client, userId));
          dispatch(sync());
        }
      } else {
        const state = getState();
        const userId = state.user?.id || state.storage.tempUserId;
        const result = await env.service.googleSignIn("test", userId, forcedUserEmail);
        await load(dispatch, "handleLogin", () => handleLogin(dispatch, result, env.service.client, userId));
        dispatch(sync());
      }
    };
  }

  export function appleSignIn(): IThunk {
    return async (dispatch, getState, env) => {
      const response = await window.AppleID.auth.signIn();
      const { id_token, code } = response.authorization;
      if (id_token != null && code != null) {
        const state = getState();
        const userId = state.user?.id || state.storage.tempUserId;
        const result = await load(dispatch, "appleSignIn", () => env.service.appleSignIn(code, id_token, userId));
        await load(dispatch, "handleLogin", () => handleLogin(dispatch, result, env.service.client, userId));
        dispatch(sync());
      }
    };
  }

  export function logOut(cb?: () => void): IThunk {
    return async (dispatch, getState, env) => {
      if (getState().user?.id) {
        await env.service.signout();
        dispatch({ type: "Logout" });
      }
      if (cb) {
        cb();
      }
    };
  }

  export function sync(): IThunk {
    return async (dispatch, getState, env) => {
      if (getState().adminKey == null && getState().user != null) {
        await load(dispatch, "sync", () => env.service.postStorage(getState().storage));
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

  export function fetchStorage(): IThunk {
    return async (dispatch, getState, env) => {
      const result = await load(dispatch, "fetchStorage", () =>
        env.service.getStorage(getState().user?.id, getState().adminKey)
      );
      await handleLogin(dispatch, result, env.service.client, getState().user?.id || getState().storage.tempUserId);
    };
  }

  export function sendTimerPushNotification(sid?: number): IThunk {
    return async (dispatch, getState, env) => {
      if (getState().adminKey == null) {
        env.audio.play();
        if (sid != null) {
          env.service.sendTimerPushNotification(sid);
        }
      }
    };
  }

  export function pushScreen(screen: IScreen): IThunk {
    return async (dispatch) => {
      dispatch({ type: "PushScreen", screen });
      window.scroll(0, 0);
    };
  }

  export function pullScreen(): IThunk {
    return async (dispatch) => {
      dispatch({ type: "PullScreen" });
      window.scroll(0, 0);
    };
  }

  export function publishProgram(args: Pick<IProgram, "id" | "author" | "name" | "description" | "url">): IThunk {
    const { id, author, name, description, url } = args;
    return async (dispatch, getState, env) => {
      const state = getState();
      const program = {
        ...Program.getEditingProgram(state)!,
        id,
        author,
        name,
        description,
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
      const programs = await load(dispatch, "fetchPrograms", () => env.service.programs());
      dispatch({ type: "UpdateState", lensRecording: [lb<IState>().p("programs").record(programs)] });
    };
  }

  export function fetchFriends(username: string): IThunk {
    return async (dispatch, getState, env) => {
      updateState(dispatch, [lb<IState>().p("allFriends").p("isLoading").record(true)]);
      const friends = await env.service.getFriends(username);
      const allFriends = friends.reduce<IAllFriends>(
        (memo, friend) => {
          memo.sortedIds.push(friend.user.id);
          memo.friends[friend.user.id] = friend;
          return memo;
        },
        { sortedIds: [], friends: {}, isLoading: false }
      );
      updateState(dispatch, [lb<IState>().p("allFriends").record(allFriends)]);
    };
  }

  export function fetchFriendsHistory(startDate: string, endDate?: string): IThunk {
    return async (dispatch, getState, env) => {
      const friends = await load(dispatch, "fetchFriendsHistory", () =>
        env.service.getFriendsHistory(startDate, endDate)
      );
      for (const key of ObjectUtils.keys(friends)) {
        const friend = friends[key]!;
        const migratedStorage = await runMigrations(env.service.client, {
          ...friend.storage,
          programs: [],
          stats: { length: {}, weight: {} },
        });
        friend.storage = migratedStorage;
      }

      updateState(dispatch, [
        lb<IState>()
          .p("friendsHistory")
          .recordModify((aFriendsHistory) => {
            const friendsHistory = { ...aFriendsHistory };
            for (const key of ObjectUtils.keys(friends)) {
              const friend = friendsHistory[key];
              if (friend != null) {
                let history = friend.storage.history.concat(friends[key]?.storage.history || []);
                history.sort((a, b) => {
                  return new Date(Date.parse(b.date)).getTime() - new Date(Date.parse(a.date)).getTime();
                });
                history = CollectionUtils.uniqBy(history, "id");
                friendsHistory[key] = { ...friend, storage: { ...friend.storage, history } };
              } else {
                friendsHistory[key] = friends[key];
              }
            }
            return friendsHistory;
          }),
      ]);
    };
  }

  export function fetchLikes(startDate: string, endDate?: string): IThunk {
    return async (dispatch, getState, env) => {
      updateState(dispatch, [lb<IState>().p("likes").p("isLoading").record(true)]);
      const newLikes = await load(dispatch, "fetchLikes", () => env.service.getLikes(startDate, endDate));
      updateState(dispatch, [lb<IState>().p("likes").p("isLoading").record(false)]);
      updateState(dispatch, [
        lb<IState>()
          .p("likes")
          .p("likes")
          .recordModify((likes) => ({ ...likes, ...newLikes })),
      ]);
    };
  }

  export function like(friendId: string, historyRecordId: number): IThunk {
    return async (dispatch, getState, env) => {
      const key = `${friendId}_${historyRecordId}`;
      const userId = getState().user!.id;
      const userNickname = getState().storage.settings.nickname || userId;
      const existingLike = (getState().likes.likes[key] || []).filter((lks) => lks.userId === userId)[0];

      const addLike = (): void => {
        const l: ILike = {
          friendIdHistoryRecordId: key,
          userId,
          userNickname,
          friendId,
          historyRecordId: historyRecordId,
          timestamp: Date.now(),
        };
        updateState(dispatch, [
          lb<IState>()
            .p("likes")
            .p("likes")
            .p(key)
            .recordModify((lks) => [...(lks || []), l]),
        ]);
      };
      const removeLike = (): void => {
        updateState(dispatch, [
          lb<IState>()
            .p("likes")
            .p("likes")
            .p(key)
            .recordModify((lks) => CollectionUtils.removeBy(lks || [], "userId", userId)),
        ]);
      };
      if (existingLike) {
        removeLike();
      } else {
        addLike();
      }

      const result = await load(dispatch, "like", () => env.service.like(friendId, historyRecordId));
      if (result == null) {
        if (existingLike) {
          addLike();
        } else {
          removeLike();
        }
      } else if (result && existingLike) {
        addLike();
      } else if (!result && !existingLike) {
        removeLike();
      }
    };
  }

  export function inviteFriend(friendId: string, message: string): IThunk {
    return friendAction(friendId, "invited", (service) => service.inviteFriend(friendId, message));
  }

  export function removeFriend(friendId: string): IThunk {
    return friendAction(friendId, undefined, (service) => service.removeFriend(friendId));
  }

  export function acceptFriendshipInvitation(friendId: string): IThunk {
    return friendAction(friendId, "active", async (service, state, dispatch) => {
      const result = await service.acceptFrienshipInvitation(friendId);
      if (result.success) {
        fetchAllFriendsThings(dispatch, state.storage);
      }
      return result;
    });
  }

  export function getComments(startDate: string, endDate?: string): IThunk {
    return async (dispatch, getState, env) => {
      const comments = await load(dispatch, "getComments", () => env.service.getComments(startDate, endDate));
      updateState(dispatch, [
        lb<IState>()
          .p("comments")
          .p("comments")
          .record(comments || {}),
      ]);
    };
  }

  export function postComment(historyRecordId: string, friendId: string, text: string): IThunk {
    return async (dispatch, getState, env) => {
      updateState(dispatch, [lb<IState>().p("comments").p("isPosting").record(true)]);
      try {
        const comment = await env.service.postComment(historyRecordId, friendId, text);
        updateState(dispatch, [
          lb<IState>()
            .p("comments")
            .p("comments")
            .p(historyRecordId)
            .recordModify((comments) => [...(comments || []), comment]),
        ]);
      } catch (e) {
        updateState(dispatch, [
          lb<IState>().p("notification").record({ content: "Failed to post comment", type: "error" }),
        ]);
      } finally {
        updateState(dispatch, [lb<IState>().p("comments").p("isPosting").record(false)]);
      }
    };
  }

  export function removeComment(historyRecordId: string, id: string): IThunk {
    return async (dispatch, getState, env) => {
      updateState(dispatch, [lb<IState>().p("comments").p("isRemoving").p(id).record(true)]);
      try {
        await env.service.deleteComment(id);
        updateState(dispatch, [
          lb<IState>()
            .p("comments")
            .p("comments")
            .p(historyRecordId)
            .recordModify((comments) => CollectionUtils.removeBy(comments || [], "id", id)),
        ]);
      } catch (e) {
        updateState(dispatch, [
          lb<IState>().p("notification").record({ content: "Failed to delete comment", type: "error" }),
        ]);
      } finally {
        updateState(dispatch, [lb<IState>().p("comments").p("isRemoving").p(id).record(undefined)]);
      }
    };
  }

  export function exportStorage(): IThunk {
    return async (dispatch, getState, env) => {
      ImportExporter.exportStorage(getState().storage);
    };
  }

  export function exportProgram(program: IProgram): IThunk {
    return async (dispatch, getState, env) => {
      const state = getState();
      Program.exportProgram(program, state.storage.settings, state.storage.version);
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

  export function importProgram(maybeProgram: string): IThunk {
    return async (dispatch, getState, env) => {
      let parsedMaybeProgram: IExportedProgram;
      try {
        parsedMaybeProgram = JSON.parse(maybeProgram);
      } catch (e) {
        alert("Couldn't parse the provided file");
        return;
      }
      const payload = Storage.getDefault();
      payload.settings.exercises = { ...payload.settings.exercises, ...parsedMaybeProgram.customExercises };
      payload.programs.push(parsedMaybeProgram.program);
      payload.version = parsedMaybeProgram.version;
      const result = await Storage.get(env.service.client, payload, false);
      if (result.success) {
        const storage = result.data;
        const customExercises = storage.settings.exercises;
        const program = storage.programs.filter((p) => p.id === parsedMaybeProgram.program.id)[0];
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
                const index = programs.findIndex((p) => p.id === program.id);
                if (index !== -1) {
                  return CollectionUtils.setAt(programs, index, program);
                } else {
                  return [...programs, program];
                }
              }),
          ],
          "Importing Program"
        );
        alert("Successfully imported");
      } else {
        alert(`Couldn't import the storage, errors: \n${result.error.join("\n")}`);
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

  export function fetchInitial(): IThunk {
    return async (dispatch, getState, env) => {
      if (getState().storage.whatsNew == null) {
        WhatsNew.updateStorage(dispatch);
      }
      dispatch(Thunk.fetchPrograms());
      if (getState().user?.id) {
        fetchAllFriendsThings(dispatch, getState().storage);
      }
    };
  }
}

function friendAction<T>(
  friendId: string,
  resultingStatus: IFriendStatus | undefined,
  cb: (service: Service, state: IState, dispatch: IDispatch) => Promise<IEither<boolean, string>>
): IThunk {
  return async (dispatch, getState, env) => {
    const initialStatus = getState().allFriends.friends[friendId]?.status;
    updateState(dispatch, [lb<IState>().p("allFriends").p("friends").pi(friendId).p("status").record("loading")]);
    const result = await cb(env.service, getState(), dispatch);
    updateState(dispatch, [
      lb<IState>()
        .p("allFriends")
        .p("friends")
        .pi(friendId)
        .p("status")
        .record(result.success ? resultingStatus : initialStatus),
    ]);
    if (!result.success) {
      updateState(dispatch, [lb<IState>().p("notification").record({ content: result.error, type: "error" })]);
    }
  };
}

async function load<T>(dispatch: IDispatch, name: string, cb: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    _load(dispatch, name, cb, 0, resolve, reject);
  });
}

function _load<T>(
  dispatch: IDispatch,
  name: string,
  cb: () => Promise<T>,
  attempt: number,
  resolve: (arg: T) => void,
  reject: (arg: unknown) => void
): void {
  updateState(dispatch, [lb<IState>().p("loading").p("items").p(name).record(true)]);
  cb()
    .then((r) => {
      updateState(dispatch, [lb<IState>().p("loading").p("items").p(name).record(false)]);
      resolve(r);
    })
    .catch((e) => {
      if (attempt >= 3) {
        updateState(dispatch, [lb<IState>().p("loading").p("error").record("Failed to sync with cloud")]);
        updateState(dispatch, [lb<IState>().p("loading").p("items").p(name).record(false)]);
        reject(e);
      } else {
        setTimeout(() => {
          _load(dispatch, name, cb, attempt + 1, resolve, reject);
        }, 1000);
      }
    });
}

function fetchAllFriendsThings(dispatch: IDispatch, storage: IStorage): void {
  const lastVisibleHistoryRecordIndex = Math.min(20, storage.history.length - 1);
  const date = storage.history[lastVisibleHistoryRecordIndex]?.date || "2019-01-01T00:00:00.000Z";
  dispatch(Thunk.fetchFriends(""));
  dispatch(Thunk.fetchFriendsHistory(date));
  dispatch(Thunk.fetchLikes(date));
  dispatch(Thunk.getComments(date));
}

async function handleLogin(
  dispatch: IDispatch,
  result: IGetStorageResponse,
  client: Window["fetch"],
  oldUserId?: string
): Promise<void> {
  if (result.email != null) {
    Rollbar.configure({ payload: { environment: __ENV__, person: { email: result.email, id: result.user_id } } });
    const storage = await runMigrations(client, result.storage);
    storage.tempUserId = result.user_id;
    storage.email = result.email;
    if (oldUserId === result.user_id) {
      dispatch({ type: "SyncStorage", storage });
      dispatch({ type: "Login", email: result.email, userId: result.user_id });
    } else {
      const newState = await getInitialState(client, { storage });
      newState.user = { id: result.user_id, email: result.email };
      dispatch({ type: "ReplaceState", state: newState });
    }
    dispatch(Thunk.fetchInitial());
  }
}
