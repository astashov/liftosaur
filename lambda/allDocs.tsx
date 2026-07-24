import { renderPage } from "./render";
import { DocsListHtml } from "../src/pages/docs/docsListHtml";
import { IDocIndexEntry } from "../src/models/doc";

export function renderAllDocsHtml(client: Window["fetch"], docs: IDocIndexEntry[], isLoggedIn: boolean): string {
  return renderPage(<DocsListHtml client={client} docs={docs} isLoggedIn={isLoggedIn} />);
}
