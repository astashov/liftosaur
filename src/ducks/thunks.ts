import { IThunk, IDispatch } from "./types";
import { IScreen } from "../models/screen";
import RB from "rollbar";
import { IGetStorageResponse, Service } from "../api/service";
import { lb } from "lens-shmens";
import { Program } from "../models/program";
import { getGoogleAccessToken } from "../utils/googleAccessToken";
import { IAllFriends, IFriendStatus, IState, updateState } from "../models/state";
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

  export function inviteFriend(friendId: string, message: string): IThunk {
    return friendAction(friendId, "invited", (service) => service.inviteFriend(friendId, message));
  }

  export function removeFriend(friendId: string): IThunk {
    return friendAction(friendId, undefined, (service) => service.removeFriend(friendId));
  }

  export function acceptFriendshipInvitation(friendId: string): IThunk {
    return friendAction(friendId, "active", (service) => service.acceptFrienshipInvitation(friendId));
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
  }
}
