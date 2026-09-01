import { PageWrapper } from "./components/pageWrapper";
import { IProgramsListContentProps, ProgramsListContent } from "./pages/programsList/programsListContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";
import { DeviceId_get } from "./utils/deviceId";

async function main(): Promise<void> {
  const deviceId = await DeviceId_get();
  HydrateUtils_hydratePage<IProgramsListContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <ProgramsListContent {...data} deviceId={deviceId} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
