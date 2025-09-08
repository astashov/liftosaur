import { h } from "preact";
import { HydrateUtils } from "./utils/hydrate";
import { UserAffiliatesContent, IUserAffiliatesContentProps } from "./pages/userAffiliates/userAffiliatesContent";
import { PageWrapper } from "./components/pageWrapper";

function main(): void {
  HydrateUtils.hydratePage<IUserAffiliatesContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <UserAffiliatesContent {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
