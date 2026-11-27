import { PageWrapper } from "./components/pageWrapper";
import { ICompareListContentProps, CompareListContent } from "./pages/compare/compareListContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";

function main(): void {
  HydrateUtils_hydratePage<ICompareListContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <CompareListContent {...data} />
    </PageWrapper>
  ));
}

main();
