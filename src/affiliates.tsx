import { h } from "preact";
import { HydrateUtils } from "./utils/hydrate";
import { AffiliatesContent, IAffiliatesContentProps } from "./pages/affiliates/affiliatesContent";
import { PageWrapper } from "./components/pageWrapper";

function main(): void {
  HydrateUtils.hydratePage<IAffiliatesContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <AffiliatesContent {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
