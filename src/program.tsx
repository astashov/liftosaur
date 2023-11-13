import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import { IProgramContentSyncerProps, ProgramContentSyncer } from "./pages/program/programContentSyncer";
import { HydrateUtils } from "./utils/hydrate";

function main(): void {
  HydrateUtils.hydratePage<IProgramContentSyncerProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <ProgramContentSyncer {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
