/* eslint-disable @typescript-eslint/no-explicit-any */
import { h, render } from "preact";
import RB from "rollbar";
import { RollbarUtils } from "./utils/rollbar";

declare let Rollbar: RB;
declare let __ENV__: string;
Rollbar.configure(RollbarUtils.config());

import { AppView } from "./components/app";
import { AudioInterface } from "./lib/audioInterface";
import { getInitialState, getIdbKey } from "./ducks/reducer";
import { DateUtils } from "./utils/date";
import { IndexedDBUtils } from "./utils/indexeddb";
import { Service } from "./api/service";
import { UrlUtils } from "./utils/url";
import { AsyncQueue } from "./utils/asyncQueue";

IndexedDBUtils.initializeForSafari();

if ("serviceWorker" in navigator && (typeof window === "undefined" || window.location.protocol.startsWith("http"))) {
  navigator.serviceWorker.register("/webpushr-sw.js");
}

console.log(DateUtils.formatYYYYMMDDHHMM(Date.now()));
const client = window.fetch.bind(window);
const audio = new AudioInterface();
const url = UrlUtils.build(document.location.href);
const userId = url.searchParams.get("userid") || undefined;
const adminKey = url.searchParams.get("admin");

async function initialize(loadedData: unknown): Promise<void> {
  (window as any).loadedData = loadedData;
  const initialState = await getInitialState(client, { url, rawStorage: loadedData as string | undefined });
  if (adminKey) {
    initialState.adminKey = adminKey;
  }
  const uid = initialState.user?.id || initialState.storage.tempUserId;
  Rollbar.configure(RollbarUtils.config({ person: { id: uid } }));
  (window as any).state = initialState;
  (window as any).service = new Service(window.fetch.bind(window));
  const queue = new AsyncQueue();
  render(
    <AppView initialState={initialState} client={client} audio={audio} queue={queue} />,
    document.getElementById("app")!
  );
}

IndexedDBUtils.getAllKeys();

async function main(): Promise<void> {
  IndexedDBUtils.get(await getIdbKey(userId, !!adminKey))
    .then(initialize)
    .catch((e) => {
      console.error(e);
      initialize(undefined);
    });
}

main();

(window as any).storeData = async (data: any) => {
  IndexedDBUtils.set(await getIdbKey(userId, !!adminKey), typeof data === "string" ? data : JSON.stringify(data)).catch(
    (e) => {
      console.error(e);
    }
  );
};

(window as any).clearData = async (data: any) => {
  IndexedDBUtils.set(await getIdbKey(userId, !!adminKey), undefined).catch((e) => {
    console.error(e);
  });
};
