import { PageWrapper } from "./components/pageWrapper";
import { IProgramOrPlannerSyncerProps, ProgramOrPlannerSyncer } from "./pages/program/programOrPlannerSyncer";
import { PlannerGridContext } from "./pages/planner/plannerGridContext";
import { PlannerGrid } from "./pages/planner/components/plannerGrid";
import { HydrateUtils_hydratePage } from "./utils/hydrate";
import { DeviceId_get } from "./utils/deviceId";

async function main(): Promise<void> {
  const deviceId = await DeviceId_get();
  HydrateUtils_hydratePage<IProgramOrPlannerSyncerProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <PlannerGridContext.Provider value={PlannerGrid}>
        <ProgramOrPlannerSyncer {...data} deviceId={deviceId} client={window.fetch.bind(window)} />
      </PlannerGridContext.Provider>
    </PageWrapper>
  ));
}

main();
