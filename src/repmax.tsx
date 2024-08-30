import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import { IRepMaxContentProps, RepMaxContent } from "./pages/repmax/repMaxContent";
import { HydrateUtils } from "./utils/hydrate";

function main(): void {
  HydrateUtils.hydratePage<IRepMaxContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <RepMaxContent {...data} />
    </PageWrapper>
  ));
}

main();
