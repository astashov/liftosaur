import RB from "rollbar";
import { hydrate, JSX } from "preact";

declare let Rollbar: RB;
declare let __ENV__: string;

export namespace HydrateUtils {
  export function hydratePage<T>(cb: (data: T) => JSX.Element): void {
    Rollbar.configure({ payload: { environment: __ENV__ } });

    const escapedRawData = document.querySelector("#data")?.innerHTML || "{}";
    const parser = new DOMParser();
    const unescapedRawData = parser.parseFromString(escapedRawData, "text/html").documentElement.textContent || "{}";
    const data = JSON.parse(unescapedRawData) as T;
    hydrate(cb(data), document.getElementById("app")!);
  }
}
