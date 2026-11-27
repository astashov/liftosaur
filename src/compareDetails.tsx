import { PageWrapper } from "./components/pageWrapper";
import { ICompareDetailsContentProps, CompareDetailsContent } from "./pages/compare/compareDetailsContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";

function main(): void {
  HydrateUtils_hydratePage<ICompareDetailsContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <CompareDetailsContent {...data} />
    </PageWrapper>
  ));
}

main();
