import { h } from "preact";
import { IAccount } from "../src/models/account";
import { RepMaxHtml } from "../src/pages/repmax/repMaxHtml";

import { renderPage } from "./render";

export function renderRepMaxHtml(client: Window["fetch"], reps: number | undefined, account?: IAccount): string {
  return renderPage(<RepMaxHtml client={client} reps={reps} />);
}
