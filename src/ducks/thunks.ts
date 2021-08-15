import { IThunk, IDispatch } from "./types";
import { IScreen } from "../models/screen";
import RB from "rollbar";
import { IGetStorageResponse, Service } from "../api/service";
import { lb } from "lens-shmens";
import { Program } from "../models/program";
import { getGoogleAccessToken } from "../utils/googleAccessToken";
import { IAllFriends, IFriendStatus, ILike, IState, updateState } from "../models/state";
import { IProgram } from "../types";
import { runMigrations } from "../migrations/runner";
import { IEither } from "../utils/types";
import { ObjectUtils } from "../utils/object";
import { CollectionUtils } from "../utils/collection";

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
          const result = await env.service.googleSignIn(accessToken);
          await handleLogin(dispatch, result, env.service.client);
          dispatch(sync());
        }
      } else {
        const result = await env.service.googleSignIn("test", forcedUserEmail);
        await handleLogin(dispatch, result, env.service.client);
        dispatch(sync());
      }
    };
  }

  export function logOut(): IThunk {
    return async (dispatch, getState, env) => {
      await env.service.signout();
      dispatch({ type: "Logout" });
    };
  }

  export function sync(): IThunk {
    return async (dispatch, getState, env) => {
      if (getState().adminKey == null && getState().user != null) {
        await load(dispatch, "sync", () => env.service.postStorage(getState().storage));
      }
    };
  }

  export function fetchStorage(): IThunk {
    return async (dispatch, getState, env) => {
      const result = await load(dispatch, "fetchStorage", () =>
        env.service.getStorage(getState().user?.id, getState().adminKey)
      );
      await handleLogin(dispatch, result, env.service.client);
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
    return friendAction(friendId, "active", (service) => service.acceptFrienshipInvitation(friendId));
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
}

function friendAction<T>(
  friendId: string,
  resultingStatus: IFriendStatus | undefined,
  cb: (service: Service) => Promise<IEither<boolean, string>>
): IThunk {
  return async (dispatch, getState, env) => {
    const initialStatus = getState().allFriends.friends[friendId]?.status;
    updateState(dispatch, [lb<IState>().p("allFriends").p("friends").pi(friendId).p("status").record("loading")]);
    const result = await cb(env.service);
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
  updateState(dispatch, [lb<IState>().p("loading").p("items").p(name).record(true)]);
  try {
    const result = await cb();
    return result;
  } catch (e) {
    updateState(dispatch, [lb<IState>().p("loading").p("error").record("Failed to sync with cloud")]);
    throw e;
  } finally {
    updateState(dispatch, [lb<IState>().p("loading").p("items").p(name).record(false)]);
  }
}

async function handleLogin(dispatch: IDispatch, result: IGetStorageResponse, client: Window["fetch"]): Promise<void> {
  if (result.email != null) {
    Rollbar.configure({ payload: { environment: __ENV__, person: { email: result.email, id: result.user_id } } });
    const storage = await runMigrations(client, result.storage);
    dispatch({ type: "Login", email: result.email, userId: result.user_id });
    dispatch({ type: "SyncStorage", storage });
    const lastVisibleHistoryRecordIndex = Math.min(20, storage.history.length - 1);
    const date = storage.history[lastVisibleHistoryRecordIndex]?.date || "2019-01-01T00:00:00.000Z";
    dispatch(Thunk.fetchFriends(""));
    dispatch(Thunk.fetchFriendsHistory(date));
    dispatch(Thunk.fetchLikes(date));
    dispatch(Thunk.getComments(date));
  }
}
