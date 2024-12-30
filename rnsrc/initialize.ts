/* eslint-disable @typescript-eslint/no-explicit-any */
import { createRoot } from "react-dom/client";
import { RollbarUtils } from "../src/utils/rollbar";
import { IndexedDBUtils } from "../src/utils/indexeddb";
import { DateUtils } from "../src/utils/date";
import { AudioInterface } from "../src/lib/audioInterface";
import { UrlUtils } from "../src/utils/url";
import { getIdbKey, getInitialState } from "../src/ducks/reducer";
import { AsyncQueue } from "../src/utils/asyncQueue";
import { Service } from "../src/api/service";
import { IState } from "../src/models/state";

export interface IInitializeEssentials {
  initialState: IState;
  client: Window["fetch"];
  audio: AudioInterface;
  queue: AsyncQueue;
}

export async function initializeApp(): Promise<IInitializeEssentials> {
  IndexedDBUtils.initializeForSafari();
  if (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    (typeof window === "undefined" || window.location.protocol.startsWith("http"))
  ) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    navigator.serviceWorker.register("/webpushr-sw.js");
  }

  console.log(DateUtils.formatYYYYMMDDHHMM(Date.now()));
  const client = window.fetch.bind(window);
  const audio = new AudioInterface();
  const url = typeof document !== "undefined" ? UrlUtils.build(document.location.href) : undefined;
  const userId = url?.searchParams.get("userid") || undefined;
  const adminKey = url?.searchParams.get("admin");

  IndexedDBUtils.getAllKeys();

  let loadedData: string | undefined;
  try {
    loadedData = (await IndexedDBUtils.get(await getIdbKey(userId, !!adminKey))) as string | undefined;
  } catch (e) {
    loadedData = undefined;
  }

  (window as any).loadedData = loadedData;
  const initialState = await getInitialState(client, { url, rawStorage: loadedData as string | undefined });
  if (adminKey) {
    initialState.adminKey = adminKey;
  }
  const uid = initialState.user?.id || initialState.storage.tempUserId;
  (window as any).state = initialState;
  (window as any).service = new Service(window.fetch.bind(window));
  const queue = new AsyncQueue();

  (window as any).storeData = async (data: any) => {
    IndexedDBUtils.set(
      await getIdbKey(userId, !!adminKey),
      typeof data === "string" ? data : JSON.stringify(data)
    ).catch((e) => {
      console.error(e);
    });
  };

  (window as any).clearData = async (data: any) => {
    IndexedDBUtils.set(await getIdbKey(userId, !!adminKey), undefined).catch((e) => {
      console.error(e);
    });
  };
  return { initialState, client, audio, queue };
}
