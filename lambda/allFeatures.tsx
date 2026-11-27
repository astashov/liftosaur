import { renderPage } from "./render";
import { FeaturesListHtml } from "../src/pages/features/featuresListHtml";
import { IDocIndexEntry } from "../src/models/doc";
import { IDocImageSizes } from "../src/utils/docImages";

export function renderAllFeaturesHtml(
  client: Window["fetch"],
  features: IDocIndexEntry[],
  sizes: IDocImageSizes,
  isLoggedIn: boolean
): string {
  return renderPage(<FeaturesListHtml client={client} features={features} sizes={sizes} isLoggedIn={isLoggedIn} />);
}
