import { h } from "preact";
import { ProgramDetailsHtml } from "../src/pages/programs/programDetailsHtml";
import { IProgram } from "../src/types";

import { renderPage } from "./render";

export function renderProgramDetailsHtml(programs: IProgram[], selectedProgramId: string): string {
  return renderPage(<ProgramDetailsHtml programs={programs} selectedProgramId={selectedProgramId} />);
}
