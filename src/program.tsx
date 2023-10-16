import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import { IProgramContentProps, ProgramContent } from "./pages/program/programContent";
import { HydrateUtils } from "./utils/hydrate";

function main(): void {
  HydrateUtils.hydratePage<IProgramContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <ProgramContent {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
