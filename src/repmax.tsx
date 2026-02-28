import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import { IRepMaxContentProps, RepMaxContent } from "./pages/repmax/repMaxContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";

function main(): void {
  HydrateUtils_hydratePage<IRepMaxContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <RepMaxContent {...data} />
    </PageWrapper>
  ));
}

main();
