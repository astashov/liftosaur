import { h } from "preact";
import { HydrateUtils } from "./utils/hydrate";
import {
  AffiliateDashboardContent,
  IAffiliateDashboardContentProps,
} from "./pages/affiliateDashboard/affiliateDashboardContent";

function main(): void {
  HydrateUtils.hydratePage<IAffiliateDashboardContentProps>((data) => (
    <AffiliateDashboardContent {...data} client={window.fetch.bind(window)} />
  ));
}

main();
