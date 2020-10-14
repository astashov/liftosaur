import { h, hydrate } from "preact";
import RB from "rollbar";

declare let Rollbar: RB;
declare let __ENV__: string;
Rollbar.configure({ payload: { environment: __ENV__ } });

import { RecordContent } from "./record/recordContent";
import { IRecordResponse } from "./api/service";

function main(): void {
  const data = JSON.parse(document.querySelector("#data")?.innerHTML || "{}") as IRecordResponse;
  hydrate(<RecordContent data={data} />, document.getElementById("app")!);
}

main();
