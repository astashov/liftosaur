import { h } from "preact";
import { ProgramHtml } from "../src/pages/program/programHtml";
import { IProgram } from "../src/types";

import { renderPage } from "./render";

export function renderProgramHtml(client: Window["fetch"], program?: IProgram): string {
  return renderPage(<ProgramHtml program={program} client={client} />);
}
