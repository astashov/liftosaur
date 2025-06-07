/* eslint-disable @typescript-eslint/ban-types */
import RB, { Dictionary, LogArgument } from "rollbar";
import { Service } from "../api/service";
import { IState } from "../models/state";
import { UidFactory } from "./generator";

declare let __ENV__: string;
declare let __FULL_COMMIT_HASH__: string;

interface IOccurenceResponse {
  err: number;
  result: {
    data: {
      liftosaur_exception_id: string;
    };
  };
}

declare let __API_HOST__: string;

export const exceptionIgnores = [
  "Script error",
  "Failed to fetch",
  "Failed to register a ServiceWorker",
  "The element has no supported sources",
  "The operation was aborted",
  "FetchEvent.respondWith received an error",
  "play() failed because the user",
  "play() request was interrupted",
  "The request is not allowed by the user agent or the platform",
  "Load failed",
  "Function timed out",
  "is out of range for changeset",
  "when attempting to fetch resource",
  "Selection points outside of document",
  "Invalid position",
  "outdated_client_storage",
  '{"isTrusted":true}',
];

export namespace RollbarUtils {
  export async function load(item: string | number, token: string): Promise<void> {
    const result = await fetch(`https://api.rollbar.com/api/1/instance/${item}`, {
      headers: {
        accept: "application/json",
        "X-Rollbar-Access-Token": token,
      },
    });
    const json = (await result.json()) as IOccurenceResponse;
    if (json.err === 0) {
      const id = json.result.data.liftosaur_exception_id;
      const service = new Service(window.fetch.bind(window));
      const data = await service.getExceptionData(id);
      if (data == null) {
        console.error("No exception info");
        return;
      }
      const { lastState, lastActions } = JSON.parse(data);
      if (lastState && lastActions) {
        const state = JSON.parse(lastState) as IState;
        state.nosync = true;
        window.replaceState(state);
        console.log("Last Actions");
        console.log(JSON.parse(lastActions));
      } else {
        console.error("No last state or actions");
      }
    } else {
      console.error(json);
    }
  }

  export function checkIgnore(isUncaught: boolean, args: LogArgument[], item: Dictionary): boolean {
    const firstArg = args[0];
    const message = typeof firstArg === "object" && "message" in firstArg ? firstArg.message : firstArg;
    if (message && typeof message === "string" && exceptionIgnores.some((i) => message.indexOf(i) !== -1)) {
      return true;
    }
    return false;
  }

  export function config(payload?: object): RB.Configuration {
    return {
      enabled: __ENV__ === "production" || __ENV__ === "prod-lambda" || __ENV__ === "android",
      payload: {
        environment: __ENV__,
        client: {
          javascript: {
            source_map_enabled: true,
            code_version: __FULL_COMMIT_HASH__,
            guess_uncaught_frames: true,
          },
        },
        ...(payload || {}),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform: async (pld: any, item: any) => {
        const shouldIgnore = checkIgnore(false, [item?.err?.message], item);
        if (shouldIgnore) {
          return;
        }
        const id = UidFactory.generateUid(12);
        pld.liftosaur_exception_id = id;
        fetch(`${__API_HOST__}/api/exception`, {
          method: "POST",
          body: JSON.stringify({
            id,
            data: {
              userid: pld.person?.id,
              lastState: window.reducerLastState ? JSON.stringify(window.reducerLastState) : undefined,
              lastActions: window.reducerLastActions ? JSON.stringify(window.reducerLastActions) : undefined,
            },
          }),
          credentials: "include",
        });
      },
      checkIgnore: checkIgnore,
    };
  }
}

if (typeof window !== "undefined") {
  window.loadRollbar = RollbarUtils.load;
}
