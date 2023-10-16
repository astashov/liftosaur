import { h } from "preact";
import { BuilderContent } from "./pages/builder/builderContent";
import { HydrateUtils } from "./utils/hydrate";
import { IBuilderProgram } from "./pages/builder/models/types";
import { PageWrapper } from "./components/pageWrapper";

function main(): void {
  HydrateUtils.hydratePage<IBuilderProgram>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <BuilderContent {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}

main();
