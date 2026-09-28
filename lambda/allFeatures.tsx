import { renderPage } from "./render";
import { FeaturesListHtml } from "../src/pages/features/featuresListHtml";
import { IDocIndexEntry } from "../src/models/doc";
import { IFeatureImageSizes } from "../src/pages/features/featureImages";

export function renderAllFeaturesHtml(
  client: Window["fetch"],
  features: IDocIndexEntry[],
  sizes: IFeatureImageSizes,
  isLoggedIn: boolean
): string {
  return renderPage(<FeaturesListHtml client={client} features={features} sizes={sizes} isLoggedIn={isLoggedIn} />);
}
