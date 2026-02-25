import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import { IUsersDashboardContentProps, UsersDashboardContent } from "./pages/usersDashboard/usersDashboardContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";

function main(): void {
  HydrateUtils_hydratePage<IUsersDashboardContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <UsersDashboardContent {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
