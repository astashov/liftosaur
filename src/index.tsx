/* eslint-disable @typescript-eslint/no-explicit-any */
import { h, render } from "preact";
import RB from "rollbar";
import { RollbarUtils_config } from "./utils/rollbar";

declare let Rollbar: RB;
declare let __ENV__: string;
declare let __BUNDLE_VERSION_IOS__: number;
declare let __BUNDLE_VERSION_ANDROID__: number;
Rollbar.configure(RollbarUtils_config());

// These markers are used by native apps to detect bundle version changes
const BUNDLE_VERSION_IOS = __BUNDLE_VERSION_IOS__;
const BUNDLE_VERSION_ANDROID = __BUNDLE_VERSION_ANDROID__;
// eslint-disable-next-line no-void
void BUNDLE_VERSION_IOS;
// eslint-disable-next-line no-void
void BUNDLE_VERSION_ANDROID;

import { AppView } from "./components/app";
import { AudioInterface } from "./lib/audioInterface";
import { getInitialState, getIdbKey } from "./ducks/reducer";
import { DateUtils_formatYYYYMMDDHHMM } from "./utils/date";
import {
  IndexedDBUtils_initializeForSafari,
  IndexedDBUtils_getAllKeys,
  IndexedDBUtils_get,
  IndexedDBUtils_set,
} from "./utils/indexeddb";
import { Service } from "./api/service";
import { UrlUtils_build } from "./utils/url";
import { AsyncQueue } from "./utils/asyncQueue";
import { DeviceId_get } from "./utils/deviceId";

IndexedDBUtils_initializeForSafari();

if ("serviceWorker" in navigator && (typeof window === "undefined" || window.location.protocol.startsWith("http"))) {
  navigator.serviceWorker.register("/webpushr-sw.js");
}

console.log(DateUtils_formatYYYYMMDDHHMM(Date.now()));
const client = window.fetch.bind(window);
const audio = new AudioInterface();
const url = UrlUtils_build(document.location.href);
const userId = url.searchParams.get("userid") || undefined;
const adminKey = url.searchParams.get("admin");

async function initialize(loadedData: unknown): Promise<void> {
  try {
    (window as any).loadedData = loadedData;
    const deviceId = await DeviceId_get();
    const initialState = await getInitialState(client, { url, rawStorage: loadedData as string | undefined, deviceId });
    if (adminKey) {
      initialState.adminKey = adminKey;
    }
    const uid = initialState.user?.id || initialState.storage.tempUserId;
    Rollbar.configure(RollbarUtils_config({ person: { id: uid } }));
    (window as any).state = initialState;
    (window as any).service = new Service(window.fetch.bind(window));
    const queue = new AsyncQueue();
    (window as any).queue = queue;
    render(
      <AppView initialState={initialState} client={client} audio={audio} queue={queue} />,
      document.getElementById("app")!
    );
  } catch (e) {
    console.error(e);
    Rollbar.error("Failed to initialize app", e instanceof Error ? e : new Error(String(e)));
  }
}

IndexedDBUtils_getAllKeys();

async function main(): Promise<void> {
  IndexedDBUtils_get(await getIdbKey(userId, !!adminKey))
    .then(initialize)
    .catch((e) => {
      console.error(e);
      initialize(undefined);
    });
}

main();

setTimeout(() => {
  const appEl = document.getElementById("app");
  if (appEl && appEl.childElementCount === 0) {
    Rollbar.error("White screen detected - app failed to render after 10s");
  }
}, 10000);

(window as any).storeData = async (data: any) => {
  IndexedDBUtils_set(await getIdbKey(userId, !!adminKey), typeof data === "string" ? data : JSON.stringify(data)).catch(
    (e) => {
      console.error(e);
    }
  );
};

(window as any).clearData = async (data: any) => {
  IndexedDBUtils_set(await getIdbKey(userId, !!adminKey), undefined).catch((e) => {
    console.error(e);
  });
};
