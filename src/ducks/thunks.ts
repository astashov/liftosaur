import { IThunk, IDispatch } from "./types";
import { IScreen } from "../models/screen";
import RB from "rollbar";
import { IGetStorageResponse } from "../api/service";
import { lb } from "lens-shmens";
import { Program } from "../models/program";
import { getGoogleAccessToken } from "../utils/googleAccessToken";
import { IState } from "../models/state";
import { IProgram } from "../types";
import { runMigrations } from "../migrations/runner";

declare let Rollbar: RB;
declare let __ENV__: string;
declare let __HOST__: string;

export namespace Thunk {
  export function googleSignIn(): IThunk {
    return async (dispatch, getState, env) => {
      const accessToken = await getGoogleAccessToken();
      if (accessToken != null) {
        const result = await env.service.googleSignIn(accessToken);
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
        await env.service.postStorage(getState().storage);
      }
    };
  }

  export function fetchStorage(): IThunk {
    return async (dispatch, getState, env) => {
      const result = await env.service.getStorage(getState().user?.id, getState().adminKey);
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
      const programs = await env.service.programs();
      dispatch({ type: "UpdateState", lensRecording: [lb<IState>().p("programs").record(programs)] });
    };
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
