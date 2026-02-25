import { h } from "preact";
import { RepMaxHtml } from "../src/pages/repmax/repMaxHtml";

import { renderPage } from "./render";

export function renderRepMaxHtml(client: Window["fetch"], reps: number | undefined, isLoggedIn?: boolean): string {
  return renderPage(<RepMaxHtml client={client} reps={reps} isLoggedIn={isLoggedIn} />);
}
