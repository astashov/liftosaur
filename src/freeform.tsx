import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import { FreeformContent, IFreeformContentProps } from "./pages/freeform/freeformContent";
import { HydrateUtils } from "./utils/hydrate";

function main(): void {
  HydrateUtils.hydratePage<IFreeformContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <FreeformContent {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
