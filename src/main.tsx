import { h } from "preact";
import { IMainContentProps, MainContent } from "./pages/main/mainContent";
import { HydrateUtils } from "./utils/hydrate";

function main(): void {
  HydrateUtils.hydratePage<IMainContentProps>((pageWrapperProps, data) => (
    <MainContent {...data} client={window.fetch.bind(window)} />
  ));
}

main();
