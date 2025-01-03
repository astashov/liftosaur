import { createRoot } from "react-dom/client";
import { ScreenViewWrapper } from "./components/screen";
import { MockAudioInterface } from "./lib/audioInterface";
import { AsyncQueue } from "./utils/asyncQueue";
import { Service } from "./api/service";

async function main(): Promise<void> {
  const state = window.appState;
  const service = new Service(window.fetch.bind(window));
  const env = {
    service,
    audio: new MockAudioInterface(),
    queue: new AsyncQueue(),
  };
  createRoot(document.getElementById("app")!).render(<ScreenViewWrapper state={state} env={env} />);
}

main();
