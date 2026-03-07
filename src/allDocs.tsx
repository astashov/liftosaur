import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import { IDocsListContentProps, DocsListContent } from "./pages/docs/docsListContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";

function main(): void {
  HydrateUtils_hydratePage<IDocsListContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <DocsListContent {...data} />
    </PageWrapper>
  ));
}

main();
