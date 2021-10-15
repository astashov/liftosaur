import { h } from "preact";
import { ProgramDetailsContent } from "./pages/programs/programDetailsContent";
import { IProgram } from "./types";
import { HydrateUtils } from "./utils/hydrate";

interface IData {
  selectedProgramId: string;
  programs: IProgram[];
}

function main(): void {
  HydrateUtils.hydratePage<IData>((data) => <ProgramDetailsContent {...data} />);
}

main();
