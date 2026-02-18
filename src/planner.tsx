import "./localePolyfill";
import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import { IPlannerContentProps, PlannerContent } from "./pages/planner/plannerContent";
import { HydrateUtils } from "./utils/hydrate";
import { DeviceId } from "./utils/deviceId";

async function main(): Promise<void> {
  const deviceId = await DeviceId.get();
  HydrateUtils.hydratePage<IPlannerContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <PlannerContent {...data} deviceId={deviceId} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
