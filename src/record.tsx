import { h, hydrate } from "preact";
import RB from "rollbar";

declare let Rollbar: RB;
declare let __ENV__: string;
Rollbar.configure({ payload: { environment: __ENV__ } });

import { RecordContent } from "./record/recordContent";
import { IRecordResponse } from "./api/service";

function main(): void {
  const escapedRawData = document.querySelector("#data")?.innerHTML || "{}";
  const parser = new DOMParser();
  const unescapedRawData = parser.parseFromString(escapedRawData, "text/html").documentElement.textContent || "{}";
  const data = JSON.parse(unescapedRawData) as IRecordResponse;
  hydrate(<RecordContent data={data} />, document.getElementById("app")!);
}

main();
