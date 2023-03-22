import { h } from "preact";
import { FreeformHtml } from "../src/pages/freeform/freeformHtml";

import { renderPage } from "./render";

export function renderFreeformHtml(client: Window["fetch"]): string {
  return renderPage(<FreeformHtml client={client} />);
}
