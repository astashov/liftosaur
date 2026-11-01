import { PageWrapper } from "./components/pageWrapper";
import { DashboardsListContent, IDashboardsListPageData } from "./pages/dashboardsList/dashboardsListContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";
import { DeviceId_get } from "./utils/deviceId";

async function main(): Promise<void> {
  const deviceId = await DeviceId_get();
  HydrateUtils_hydratePage<IDashboardsListPageData>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <DashboardsListContent {...data} deviceId={deviceId} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
