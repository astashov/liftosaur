import { h } from "preact";
import { renderPage } from "./render";
import { DocDetailsHtml } from "../src/pages/docs/docDetailsHtml";
import { IDocIndexEntry } from "../src/models/doc";

export function renderDocDetailsHtml(
  client: Window["fetch"],
  doc: IDocIndexEntry,
  content: string,
  isLoggedIn: boolean
): string {
  return renderPage(<DocDetailsHtml client={client} doc={doc} content={content} isLoggedIn={isLoggedIn} />);
}
