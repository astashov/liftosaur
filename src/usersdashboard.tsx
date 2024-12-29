import React from "react";
import { PageWrapper } from "./components/pageWrapper";
import { IUsersDashboardContentProps, UsersDashboardContent } from "./pages/usersDashboard/usersDashboardContent";
import { HydrateUtils } from "./utils/hydrate";

function main(): void {
  HydrateUtils.hydratePage<IUsersDashboardContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <UsersDashboardContent {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
