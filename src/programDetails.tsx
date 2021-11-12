import { h } from "preact";
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
  HydrateUtils.hydratePage<IData>((data) => <ProgramDetailsContent {...data} client={window.fetch} audio={audio} />);
}

main();
