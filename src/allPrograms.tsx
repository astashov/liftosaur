import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import { IProgramsPageContentProps, ProgramsPageContent } from "./pages/programs/programsPageContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";

function main(): void {
  HydrateUtils_hydratePage<IProgramsPageContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <ProgramsPageContent {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
