import { h } from "preact";
import { HydrateUtils_hydratePage } from "./utils/hydrate";
import { IUserDashboardContentProps, UserDashboardContent } from "./pages/userDashboard/userDashboardContent";

function main(): void {
  HydrateUtils_hydratePage<IUserDashboardContentProps>((pageWrapperProps, data) => <UserDashboardContent {...data} />);
}

main();
