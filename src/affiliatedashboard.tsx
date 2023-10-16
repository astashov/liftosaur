import { h } from "preact";
import { HydrateUtils } from "./utils/hydrate";
import {
  AffiliateDashboardContent,
  IAffiliateDashboardContentProps,
} from "./pages/affiliateDashboard/affiliateDashboardContent";
import { PageWrapper } from "./components/pageWrapper";

function main(): void {
  HydrateUtils.hydratePage<IAffiliateDashboardContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <AffiliateDashboardContent {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
