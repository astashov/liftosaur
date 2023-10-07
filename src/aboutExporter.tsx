import { h, render } from "preact";
import { getIdbKey } from "./ducks/reducer";
import { IndexedDBUtils } from "./utils/indexeddb";
import { Storage } from "./models/storage";
import { AboutDisclaimer } from "./components/aboutDisclaimer";

function updateGooglePlayParams(): void {
  const params = new URLSearchParams(window.location.search);
  const source = params.get("cpgsrc");
  const medium = params.get("cpgmdm");
  const referrerParams = [];
  if (source) {
    referrerParams.push(`utm_source=${source}`);
  }
  if (medium) {
    referrerParams.push(`utm_medium=${medium}`);
  }
  const referrer = escape(referrerParams.join("&"));
  for (const link of Array.from(document.querySelectorAll(".google-play-link"))) {
    const href = link.getAttribute("href");
    link.setAttribute("href", `${href}&referrer=${referrer}`);
  }
}

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
  updateGooglePlayParams();
  IndexedDBUtils.get(await getIdbKey(undefined, false))
    .then(initialize)
    .catch((e) => {
      console.error(e);
      initialize(undefined);
    });
}

main();
