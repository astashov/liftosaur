import { renderPage } from "./render";
import { FeatureDetailsHtml } from "../src/pages/features/featureDetailsHtml";
import { IDocIndexEntry } from "../src/models/doc";

export function renderFeatureDetailsHtml(
  client: Window["fetch"],
  feature: IDocIndexEntry,
  content: string,
  isLoggedIn: boolean
): string {
  return renderPage(<FeatureDetailsHtml client={client} feature={feature} content={content} isLoggedIn={isLoggedIn} />);
}
