import { renderPage } from "./render";
import { CompareDetailsHtml } from "../src/pages/compare/compareDetailsHtml";
import { IDocIndexEntry } from "../src/models/doc";
import { IDocImageSizes } from "../src/utils/docImages";

export function renderCompareDetailsHtml(
  client: Window["fetch"],
  entry: IDocIndexEntry,
  content: string,
  sizes: IDocImageSizes,
  isLoggedIn: boolean
): string {
  return renderPage(
    <CompareDetailsHtml client={client} entry={entry} content={content} sizes={sizes} isLoggedIn={isLoggedIn} />
  );
}
