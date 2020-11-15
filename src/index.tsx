/* eslint-disable @typescript-eslint/no-explicit-any */
import { h, render } from "preact";
import RB from "rollbar";

declare let Rollbar: RB;
declare let __ENV__: string;
Rollbar.configure({ payload: { environment: __ENV__ } });

import { AppView } from "./components/app";
import { AudioInterface } from "./lib/audioInterface";
import * as IDB from "idb-keyval";
import { getInitialState } from "./ducks/reducer";
import { DateUtils } from "./utils/date";

if ("serviceWorker" in navigator) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  navigator.serviceWorker.register("/webpushr-sw.js");
}

console.log(DateUtils.formatYYYYMMDDHHMM(Date.now()));
const client = window.fetch.bind(window);
const audio = new AudioInterface();
IDB.get("liftosaur").then(async (loadedData) => {
  (window as any).loadedData = loadedData;
  const initialState = await getInitialState(client, loadedData as string | undefined);
  const adminKey = new URL(document.location.href).searchParams.get("admin");
  if (adminKey) {
    initialState.adminKey = adminKey;
  }
  (window as any).state = initialState;
  render(<AppView initialState={initialState} client={client} audio={audio} />, document.getElementById("app")!);
});

(window as any).storeData = (data: any) => {
  IDB.set("liftosaur", typeof data === "string" ? data : JSON.stringify(data)).catch((e) => {
    console.error(e);
  });
};
