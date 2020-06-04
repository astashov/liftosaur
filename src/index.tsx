import { h, render } from "preact";
import { AppView } from "./components/app";
import { AudioInterface } from "./lib/audioInterface";

if ("serviceWorker" in navigator) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  navigator.serviceWorker.register("/webpushr-sw.js");
}

const client = window.fetch.bind(window);
const audio = new AudioInterface();
render(<AppView client={client} audio={audio} />, document.getElementById("app")!);

window.addEventListener("keydown", (e) => {
  if (e.which === 69) {
    // e
    throw new Error("Oh noes");
  }
});
