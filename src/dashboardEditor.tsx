import { PageWrapper } from "./components/pageWrapper";
import { DashboardEditorContent, IDashboardEditorPageData } from "./pages/dashboardEditor/dashboardEditorContent";
import { DashboardEditorBrowserContext } from "./pages/dashboardEditor/dashboardEditorBrowserContext";
import { DashboardEditorWidgetModal } from "./pages/dashboardEditor/dashboardEditorWidgetModal";
import { HydrateUtils_hydratePage } from "./utils/hydrate";
import { DeviceId_get } from "./utils/deviceId";

const browserComponents = { WidgetModal: DashboardEditorWidgetModal };

async function main(): Promise<void> {
  const deviceId = await DeviceId_get();
  HydrateUtils_hydratePage<IDashboardEditorPageData>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <DashboardEditorBrowserContext.Provider value={browserComponents}>
        <DashboardEditorContent {...data} deviceId={deviceId} client={window.fetch.bind(window)} />
      </DashboardEditorBrowserContext.Provider>
    </PageWrapper>
  ));
}

main();
