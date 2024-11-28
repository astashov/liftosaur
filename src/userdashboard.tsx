import { h } from "preact";
import { HydrateUtils } from "./utils/hydrate";
import { IUserDashboardContentProps, UserDashboardContent } from "./pages/userDashboard/userDashboardContent";

function main(): void {
  HydrateUtils.hydratePage<IUserDashboardContentProps>((pageWrapperProps, data) => <UserDashboardContent {...data} />);
}

main();
