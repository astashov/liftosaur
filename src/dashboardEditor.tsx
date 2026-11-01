import { PageWrapper } from "./components/pageWrapper";
import { DashboardEditorContent, IDashboardEditorPageData } from "./pages/dashboardEditor/dashboardEditorContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";
import { DeviceId_get } from "./utils/deviceId";

async function main(): Promise<void> {
  const deviceId = await DeviceId_get();
  HydrateUtils_hydratePage<IDashboardEditorPageData>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <DashboardEditorContent {...data} deviceId={deviceId} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
