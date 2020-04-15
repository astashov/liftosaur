import { IThunk } from "./types";

declare let __API_HOST__: string;

export namespace Thunk {
  export function googleOauthInitialize(): IThunk {
    return async (_, __, env): Promise<void> => {
      if (window.gapi != null) {
        env.googleAuth = (await initializeGapi()).auth;
      } else {
        window.handleGapiLoad = async () => {
          env.googleAuth = (await initializeGapi()).auth;
        };
      }
    };
  }

  export function googleSignIn(): IThunk {
    return async (dispatch, getState, env) => {
      if (env.googleAuth != null) {
        const user = await env.googleAuth.signIn();
        const response = await env.client(`${__API_HOST__}/api/signin/google`, {
          method: "POST",
          body: JSON.stringify({ token: user.getAuthResponse().access_token }),
          credentials: "include"
        });
        console.log("response", response);
      }
    };
  }

  export function getCurrentUser(): IThunk {
    return async (dispatch, getState, env) => {
      const response = await env.client(`${__API_HOST__}/api/user/me`, {
        credentials: "include"
      });
      console.log("current user", await response.json());
    };
  }

  export function sync(): IThunk {
    return async (dispatch, getState, env) => {
      await env.client(`${__API_HOST__}/api/storage`, {
        method: "POST",
        body: JSON.stringify({ storage: getState().storage }),
        credentials: "include"
      });
    };
  }

  export function fetchStorage(): IThunk {
    return async (dispatch, getState, env) => {
      const result = await env.client(`${__API_HOST__}/api/storage`, { credentials: "include" });
      dispatch({ type: "SyncStorage", storage: (await result.json()).storage });
    };
  }

  function initializeGapi(): Promise<{ auth: gapi.auth2.GoogleAuth }> {
    return new Promise(resolve => {
      window.gapi.load("auth2", () => {
        const auth2 = window.gapi.auth2.init({
          scope: "openid",
          fetch_basic_profile: false,
          client_id: "944666871420-p8kv124sgte8o0p6ev2ah6npudsl7e4f.apps.googleusercontent.com"
        });

        resolve({ auth: auth2 });
      });
    });
  }
}
