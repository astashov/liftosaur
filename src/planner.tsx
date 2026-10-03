import { PageWrapper } from "./components/pageWrapper";
import { IPlannerContentProps, PlannerContent } from "./pages/planner/plannerContent";
import { PlannerGridContext } from "./pages/planner/plannerGridContext";
import { PlannerGrid } from "./pages/planner/components/plannerGrid";
import { HydrateUtils_hydratePage } from "./utils/hydrate";
import { DeviceId_get } from "./utils/deviceId";

async function main(): Promise<void> {
  const deviceId = await DeviceId_get();
  HydrateUtils_hydratePage<IPlannerContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <PlannerGridContext.Provider value={PlannerGrid}>
        <PlannerContent {...data} deviceId={deviceId} client={window.fetch.bind(window)} />
      </PlannerGridContext.Provider>
    </PageWrapper>
  ));
}

main();
