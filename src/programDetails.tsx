import React from "react";
import { PageWrapper } from "./components/pageWrapper";
import { AudioInterface } from "./lib/audioInterface";
import { ProgramDetailsContent } from "./pages/programs/programDetailsContent";
import { IProgram } from "./types";
import { HydrateUtils } from "./utils/hydrate";

interface IData {
  selectedProgramId: string;
  programs: IProgram[];
}

function main(): void {
  const audio = new AudioInterface();
  HydrateUtils.hydratePage<IData>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <ProgramDetailsContent {...data} client={window.fetch} audio={audio} />
    </PageWrapper>
  ));
}

main();
