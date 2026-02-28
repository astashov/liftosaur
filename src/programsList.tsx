import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import { IProgramsListContentProps, ProgramsListContent } from "./pages/programsList/programsListContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";

function main(): void {
  HydrateUtils_hydratePage<IProgramsListContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <ProgramsListContent {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
