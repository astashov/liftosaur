import { PageWrapper } from "./components/pageWrapper";
import { FriendsContent } from "./pages/friends/friendsContent";
import { IFriendsPageData } from "./models/friendsWeb";
import { HydrateUtils_hydratePage } from "./utils/hydrate";

HydrateUtils_hydratePage<IFriendsPageData>((pageWrapperProps, data) => (
  <PageWrapper {...pageWrapperProps}>
    <FriendsContent {...data} client={window.fetch.bind(window)} />
  </PageWrapper>
));
