import { renderPage } from "./render";
import { FeaturesListHtml } from "../src/pages/features/featuresListHtml";
import { IDocIndexEntry } from "../src/models/doc";

export function renderAllFeaturesHtml(client: Window["fetch"], features: IDocIndexEntry[], isLoggedIn: boolean): string {
  return renderPage(<FeaturesListHtml client={client} features={features} isLoggedIn={isLoggedIn} />);
}
