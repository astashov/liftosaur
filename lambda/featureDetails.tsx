import { renderPage } from "./render";
import { FeatureDetailsHtml } from "../src/pages/features/featureDetailsHtml";
import { IDocIndexEntry } from "../src/models/doc";
import { IFeatureImageSizes } from "../src/pages/features/featureImages";

export function renderFeatureDetailsHtml(
  client: Window["fetch"],
  feature: IDocIndexEntry,
  content: string,
  sizes: IFeatureImageSizes,
  isLoggedIn: boolean
): string {
  return renderPage(
    <FeatureDetailsHtml client={client} feature={feature} content={content} sizes={sizes} isLoggedIn={isLoggedIn} />
  );
}
