import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import { IPlannerContentProps, PlannerContent } from "./pages/planner/plannerContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";
import { DeviceId_get } from "./utils/deviceId";

async function main(): Promise<void> {
  const deviceId = await DeviceId_get();
  HydrateUtils_hydratePage<IPlannerContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <PlannerContent {...data} deviceId={deviceId} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
