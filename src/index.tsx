import { h, render } from "preact";
import { AppView } from "./components/app";

if ("serviceWorker" in navigator) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  navigator.serviceWorker.register("/webpushr-sw.js");
}

render(<AppView />, document.getElementById("app")!);
