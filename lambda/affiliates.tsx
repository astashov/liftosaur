import { h } from "preact";
import { AffiliatesHtml } from "../src/pages/affiliates/affiliatesHtml";

import { renderPage } from "./render";

export function renderAffiliatesHtml(client: Window["fetch"]): string {
  return renderPage(<AffiliatesHtml client={client} />);
}
