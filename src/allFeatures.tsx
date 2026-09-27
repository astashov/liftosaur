import { PageWrapper } from "./components/pageWrapper";
import { IFeaturesListContentProps, FeaturesListContent } from "./pages/features/featuresListContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";

function main(): void {
  HydrateUtils_hydratePage<IFeaturesListContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <FeaturesListContent {...data} />
    </PageWrapper>
  ));
}

main();
