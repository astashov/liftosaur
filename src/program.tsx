import { h } from "preact";
import { IProgramContentProps, ProgramContent } from "./pages/program/programContent";
import { HydrateUtils } from "./utils/hydrate";

function main(): void {
  HydrateUtils.hydratePage<IProgramContentProps>((data) => (
    <ProgramContent {...data} client={window.fetch.bind(window)} />
  ));
}

main();
