import { renderPage } from "./render";
import { FeatureDetailsHtml } from "../src/pages/features/featureDetailsHtml";
import { IDocIndexEntry } from "../src/models/doc";
import { IDocImageSizes } from "../src/utils/docImages";

export function renderFeatureDetailsHtml(
  client: Window["fetch"],
  feature: IDocIndexEntry,
  content: string,
  sizes: IDocImageSizes,
  isLoggedIn: boolean
): string {
  return renderPage(
    <FeatureDetailsHtml client={client} feature={feature} content={content} sizes={sizes} isLoggedIn={isLoggedIn} />
  );
}
