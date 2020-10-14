import { IThunk, IDispatch } from "./types";
import { IScreen } from "../models/screen";
import RB from "rollbar";
import { IGetStorageResponse } from "../api/service";
import { lb } from "../utils/lens";
import { Program } from "../models/program";
import { getGoogleAccessToken } from "../utils/googleAccessToken";
import { IState } from "../models/state";

declare let Rollbar: RB;
declare let __ENV__: string;
declare let __HOST__: string;

export namespace Thunk {
  export function googleSignIn(): IThunk {
    return async (dispatch, getState, env) => {
      const accessToken = await getGoogleAccessToken();
      if (accessToken != null) {
        const result = await env.service.googleSignIn(accessToken);
        handleLogin(dispatch, result);
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
      if (getState().user != null) {
        await env.service.postStorage(getState().storage);
      }
    };
  }

  export function fetchStorage(): IThunk {
    return async (dispatch, getState, env) => {
      const result = await env.service.getStorage();
      handleLogin(dispatch, result);
    };
  }

  export function sendTimerPushNotification(sid?: number): IThunk {
    return async (dispatch, getState, env) => {
      env.audio.play();
      if (sid != null) {
        env.service.sendTimerPushNotification(sid);
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

  export function publishProgram(): IThunk {
    return async (dispatch, getState, env) => {
      const state = getState();
      const program = Program.getEditingProgram(state)!;
      env.service.publishProgram(program);
    };
  }

  export function fetchPrograms(): IThunk {
    return async (dispatch, getState, env) => {
      const programs = await env.service.programs();
      dispatch({ type: "UpdateState", lensRecording: [lb<IState>().p("programs").record(programs)] });
    };
  }

  export function share(id: number): IThunk {
    return async (dispatch, getState, env) => {
      const userId = getState().user?.id;
      if (userId != null) {
        const link = `${__HOST__}/record?id=${id}&user=${userId}`;
        console.log(link);
      } else {
        alert(
          "You should be logged in to share workouts. You can log in in Settings (the cog icon in the bottom right corner)."
        );
      }
    };
  }
}

function handleLogin(dispatch: IDispatch, result: IGetStorageResponse): void {
  if (result.email != null) {
    Rollbar.configure({ payload: { environment: __ENV__, person: { email: result.email, id: result.user_id } } });
    dispatch({ type: "Login", email: result.email, userId: result.user_id });
    dispatch({ type: "SyncStorage", storage: result.storage });
  }
}
