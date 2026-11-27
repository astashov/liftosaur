import { renderPage } from "./render";
import { CompareListHtml } from "../src/pages/compare/compareListHtml";
import { IDocIndexEntry } from "../src/models/doc";

export function renderAllCompareHtml(client: Window["fetch"], entries: IDocIndexEntry[], isLoggedIn: boolean): string {
  return renderPage(<CompareListHtml client={client} entries={entries} isLoggedIn={isLoggedIn} />);
}
