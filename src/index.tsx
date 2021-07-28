/* eslint-disable @typescript-eslint/no-explicit-any */
import { h, render } from "preact";
import RB from "rollbar";

declare let Rollbar: RB;
declare let __ENV__: string;
Rollbar.configure({ payload: { environment: __ENV__ } });

import { AppView } from "./components/app";
import { AudioInterface } from "./lib/audioInterface";
import { getInitialState, getIdbKey } from "./ducks/reducer";
import { DateUtils } from "./utils/date";
import { IndexedDBUtils } from "./utils/indexeddb";

IndexedDBUtils.initializeForSafari();

if ("serviceWorker" in navigator) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  navigator.serviceWorker.register("/webpushr-sw.js");
}

console.log(DateUtils.formatYYYYMMDDHHMM(Date.now()));
const client = window.fetch.bind(window);
const audio = new AudioInterface();
const url = new URL(document.location.href);
const userId = url.searchParams.get("userid") || undefined;
const adminKey = url.searchParams.get("admin");

async function initialize(loadedData: unknown): Promise<void> {
  (window as any).loadedData = loadedData;
  const initialState = await getInitialState(client, url, loadedData as string | undefined);
  if (adminKey) {
    initialState.adminKey = adminKey;
  }
  (window as any).state = initialState;
  render(<AppView initialState={initialState} client={client} audio={audio} />, document.getElementById("app")!);
}

IndexedDBUtils.get(getIdbKey(userId, !!adminKey))
  .then(initialize)
  .catch((e) => {
    console.error(e);
    initialize(undefined);
  });

(window as any).storeData = (data: any) => {
  IndexedDBUtils.set(getIdbKey(userId, !!adminKey), typeof data === "string" ? data : JSON.stringify(data)).catch(
    (e) => {
      console.error(e);
    }
  );
};
