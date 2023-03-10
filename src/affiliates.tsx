import { h } from "preact";
import { HydrateUtils } from "./utils/hydrate";
import { AffiliatesContent, IAffiliatesContentProps } from "./pages/affiliates/affiliatesContent";

function main(): void {
  HydrateUtils.hydratePage<IAffiliatesContentProps>((data) => (
    <AffiliatesContent {...data} client={window.fetch.bind(window)} />
  ));
}

main();
