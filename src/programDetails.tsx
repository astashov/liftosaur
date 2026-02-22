import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import { ProgramDetailsContent } from "./pages/programs/programDetailsContent";
import { IProgram } from "./types";
import { HydrateUtils } from "./utils/hydrate";

interface IData {
  program: IProgram;
  fullDescription?: string;
}

function main(): void {
  HydrateUtils.hydratePage<IData>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <ProgramDetailsContent {...data} client={window.fetch.bind(window)} account={pageWrapperProps.account} />
    </PageWrapper>
  ));
}

main();
