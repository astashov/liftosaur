import { PageWrapper } from "./components/pageWrapper";
import { IFeatureDetailsContentProps, FeatureDetailsContent } from "./pages/features/featureDetailsContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";

function main(): void {
  HydrateUtils_hydratePage<IFeatureDetailsContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <FeatureDetailsContent {...data} />
    </PageWrapper>
  ));
}

main();
