import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import { IProgramsListContentProps, ProgramsListContent } from "./pages/programsList/programsListContent";
import { HydrateUtils } from "./utils/hydrate";

function main(): void {
  HydrateUtils.hydratePage<IProgramsListContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <ProgramsListContent {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
