import { h } from "preact";
import { IMainContentProps, MainContent } from "./pages/main/mainContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";

function main(): void {
  HydrateUtils_hydratePage<IMainContentProps>((pageWrapperProps, data) => (
    <MainContent {...data} client={window.fetch.bind(window)} />
  ));
}

main();
