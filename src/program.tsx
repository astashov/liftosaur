import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import { IProgramOrPlannerSyncerProps, ProgramOrPlannerSyncer } from "./pages/program/programOrPlannerSyncer";
import { HydrateUtils } from "./utils/hydrate";
import { DeviceId } from "./utils/deviceId";

async function main(): Promise<void> {
  const deviceId = await DeviceId.get();
  HydrateUtils.hydratePage<IProgramOrPlannerSyncerProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <ProgramOrPlannerSyncer {...data} deviceId={deviceId} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
