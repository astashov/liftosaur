import { h } from "preact";
import { BuilderContent } from "./pages/builder/builderContent";
import { HydrateUtils } from "./utils/hydrate";
import { IBuilderProgram } from "./pages/builder/models/types";

function main(): void {
  HydrateUtils.hydratePage<IBuilderProgram>((data) => <BuilderContent {...data} client={window.fetch.bind(window)} />);
}

main();
