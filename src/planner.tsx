import React from "react";
import { PageWrapper } from "./components/pageWrapper";
import { IPlannerContentProps, PlannerContent } from "./pages/planner/plannerContent";
import { HydrateUtils } from "./utils/hydrate";

function main(): void {
  HydrateUtils.hydratePage<IPlannerContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <PlannerContent {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
