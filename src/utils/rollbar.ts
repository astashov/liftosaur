/* eslint-disable @typescript-eslint/ban-types */
import RB from "rollbar";

declare let __ENV__: string;

export namespace RollbarUtils {
  export function config(payload?: object): RB.Configuration {
    return {
      payload: {
        environment: __ENV__,
        ...(payload || {}),
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
        ];
        const firstArg = args[0];
        if (isUncaught && firstArg && typeof firstArg === "string" && ignores.some((i) => firstArg.indexOf(i) === 0)) {
          return true;
        }
        return false;
      },
    };
  }
}
