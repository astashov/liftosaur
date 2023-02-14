import { h } from "preact";
import { ProgramContent } from "./pages/program/programContent";
import { IProgram } from "./types";
import { HydrateUtils } from "./utils/hydrate";

interface IData {
  program?: IProgram;
}

function main(): void {
  HydrateUtils.hydratePage<IData>((data) => <ProgramContent {...data} client={window.fetch} />);
}

main();
