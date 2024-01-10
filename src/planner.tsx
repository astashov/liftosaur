import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import { PlannerContent } from "./pages/planner/plannerContent";
import { IPlannerProgram } from "./types";
import { HydrateUtils } from "./utils/hydrate";

function main(): void {
  HydrateUtils.hydratePage<IPlannerProgram>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <PlannerContent {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
