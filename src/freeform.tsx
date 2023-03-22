import { h } from "preact";
import { FreeformContent, IFreeformContentProps } from "./pages/freeform/freeformContent";
import { HydrateUtils } from "./utils/hydrate";

function main(): void {
  HydrateUtils.hydratePage<IFreeformContentProps>((data) => (
    <FreeformContent {...data} client={window.fetch.bind(window)} />
  ));
}

main();
