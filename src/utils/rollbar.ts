/* eslint-disable @typescript-eslint/ban-types */
import RB from "rollbar";
import { Service } from "../api/service";
import { IState } from "../models/state";
import { UidFactory } from "./generator";

declare let __ENV__: string;

interface IOccurenceResponse {
  err: number;
  result: {
    data: {
      liftosaur_exception_id: string;
    };
  };
}

declare let __API_HOST__: string;

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

  export function config(payload?: object): RB.Configuration {
    return {
      payload: {
        environment: __ENV__,
        ...(payload || {}),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform: async (pld: any) => {
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
      checkIgnore: function (isUncaught, args, _payload) {
        const ignores = [
          "Script error",
          "Failed to fetch",
          "Failed to register a ServiceWorker",
          "The element has no supported sources",
          "The operation was aborted",
          "FetchEvent.respondWith received an error",
          "play() failed because the user",
          "The request is not allowed by the user agent or the platform",
          "Load failed",
        ];
        const firstArg = args[0];
        if (firstArg && typeof firstArg === "string" && ignores.some((i) => firstArg.indexOf(i) === 0)) {
          return true;
        }
        return false;
      },
    };
  }
}

if (typeof window !== "undefined") {
  window.loadRollbar = RollbarUtils.load;
}
