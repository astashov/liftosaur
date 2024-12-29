import React from "react";
import { PageWrapper } from "./components/pageWrapper";
import { IProgramOrPlannerSyncerProps, ProgramOrPlannerSyncer } from "./pages/program/programOrPlannerSyncer";
import { HydrateUtils } from "./utils/hydrate";

function main(): void {
  HydrateUtils.hydratePage<IProgramOrPlannerSyncerProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <ProgramOrPlannerSyncer {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
