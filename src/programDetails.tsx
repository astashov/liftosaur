import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import { IProgramIndexEntry } from "./models/program";
import { ProgramDetailsContent } from "./pages/programs/programDetailsContent";
import { IProgram } from "./types";
import { HydrateUtils_hydratePage } from "./utils/hydrate";

interface IData {
  program: IProgram;
  fullDescription?: string;
  indexEntry?: IProgramIndexEntry;
}

function main(): void {
  HydrateUtils_hydratePage<IData>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <ProgramDetailsContent {...data} client={window.fetch.bind(window)} account={pageWrapperProps.account} />
    </PageWrapper>
  ));
}

main();
