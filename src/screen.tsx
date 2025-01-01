import React from "react";
import { createRoot } from "react-dom/client";
import { ScreenView } from "./components/screen";

async function main(): Promise<void> {
  const state = window.appState;
  console.log("State", state);
  createRoot(document.getElementById("app")!).render(<ScreenView state={state} />);
}

main();
