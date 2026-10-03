import { PageWrapper } from "./components/pageWrapper";
import { IProgramOrPlannerSyncerProps, ProgramOrPlannerSyncer } from "./pages/program/programOrPlannerSyncer";
import { PlannerBrowserContext } from "./pages/planner/plannerBrowserContext";
import { plannerBrowserComponents } from "./pages/planner/plannerBrowserComponents";
import { HydrateUtils_hydratePage } from "./utils/hydrate";
import { DeviceId_get } from "./utils/deviceId";

async function main(): Promise<void> {
  const deviceId = await DeviceId_get();
  HydrateUtils_hydratePage<IProgramOrPlannerSyncerProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <PlannerBrowserContext.Provider value={plannerBrowserComponents}>
        <ProgramOrPlannerSyncer {...data} deviceId={deviceId} client={window.fetch.bind(window)} />
      </PlannerBrowserContext.Provider>
    </PageWrapper>
  ));
}

main();
