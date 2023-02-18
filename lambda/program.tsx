import { h } from "preact";
import { IExportedProgram } from "../src/models/program";
import { ProgramHtml } from "../src/pages/program/programHtml";

import { renderPage } from "./render";

export function renderProgramHtml(client: Window["fetch"], program?: IExportedProgram): string {
  return renderPage(<ProgramHtml exportedProgram={program} client={client} />);
}
