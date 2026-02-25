import { h } from "preact";
import { HydrateUtils_hydratePage } from "./utils/hydrate";
import { UserContent } from "./pages/user/userContent";
import { IStorage } from "./types";
import { PageWrapper } from "./components/pageWrapper";

function main(): void {
  HydrateUtils_hydratePage<IStorage>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <UserContent data={data} />
    </PageWrapper>
  ));
}

main();
