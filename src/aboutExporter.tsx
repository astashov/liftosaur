import { h, render } from "preact";
import { getIdbKey } from "./ducks/reducer";
import { IndexedDBUtils } from "./utils/indexeddb";
import { Storage } from "./models/storage";
import { AboutDisclaimer } from "./components/aboutDisclaimer";

async function initialize(loadedData: unknown): Promise<void> {
  if (loadedData != null && window.location.pathname === "/") {
    const json = JSON.parse(loadedData as string) as { storage: Record<string, unknown> };
    const result = await Storage.get(fetch, json.storage, true);
    if (result.success) {
      render(<AboutDisclaimer storage={result.data} />, document.getElementById("about-disclaimer")!);
    }
  }
}

async function main(): Promise<void> {
  IndexedDBUtils.get(await getIdbKey(undefined, false))
    .then(initialize)
    .catch((e) => {
      console.error(e);
      initialize(undefined);
    });
}

main();
