import { h } from "preact";
import { IUsersDashboardContentProps, UsersDashboardContent } from "./pages/usersDashboard/usersDashboardContent";
import { HydrateUtils } from "./utils/hydrate";

function main(): void {
  HydrateUtils.hydratePage<IUsersDashboardContentProps>((data) => (
    <UsersDashboardContent {...data} client={window.fetch.bind(window)} />
  ));
}

main();
