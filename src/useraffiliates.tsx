import { h } from "preact";
import { HydrateUtils_hydratePage } from "./utils/hydrate";
import { UserAffiliatesContent, IUserAffiliatesContentProps } from "./pages/userAffiliates/userAffiliatesContent";
import { PageWrapper } from "./components/pageWrapper";

function main(): void {
  HydrateUtils_hydratePage<IUserAffiliatesContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <UserAffiliatesContent {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
