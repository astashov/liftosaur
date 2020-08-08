import { IThunk, IDispatch } from "./types";
import { IScreen } from "../models/screen";
import RB from "rollbar";
import { IGetStorageResponse } from "../api/service";
import { lb } from "../utils/lens";
import { IState } from "./reducer";
import { Program } from "../models/program";
import { getGoogleAccessToken } from "../utils/googleAccessToken";

declare let Rollbar: RB;

export namespace Thunk {
  export function googleSignIn(): IThunk {
    return async (dispatch, getState, env) => {
      const accessToken = await getGoogleAccessToken();
      if (accessToken != null) {
        const result = await env.service.googleSignIn(accessToken);
        handleLogin(dispatch, result);
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
      if (getState().email != null) {
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
    return (dispatch, getState, env) => {
      env.audio.play();
      if (sid != null) {
        env.service.sendTimerPushNotification(sid);
      }
    };
  }

  export function pushScreen(screen: IScreen): IThunk {
    return (dispatch) => {
      dispatch({ type: "PushScreen", screen });
      window.scroll(0, 0);
    };
  }

  export function pullScreen(): IThunk {
    return (dispatch) => {
      dispatch({ type: "PullScreen" });
      window.scroll(0, 0);
    };
  }

  export function publishProgram(): IThunk {
    return (dispatch, getState, env) => {
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
}

function handleLogin(dispatch: IDispatch, result: IGetStorageResponse): void {
  if (result.email != null) {
    Rollbar.configure({ payload: { person: { email: result.email, id: result.user_id } } });
    dispatch({ type: "Login", email: result.email });
    dispatch({ type: "SyncStorage", storage: result.storage });
  }
}
