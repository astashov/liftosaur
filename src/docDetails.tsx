import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import { IDocDetailsContentProps, DocDetailsContent } from "./pages/docs/docDetailsContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";

function main(): void {
  HydrateUtils_hydratePage<IDocDetailsContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <DocDetailsContent {...data} />
    </PageWrapper>
  ));
}

main();
