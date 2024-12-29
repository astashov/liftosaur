import React from "react";
import { ProgramDetailsHtml } from "../src/pages/programs/programDetailsHtml";
import { IProgram } from "../src/types";

import { renderPage } from "./render";

export function renderProgramDetailsHtml(
  programs: IProgram[],
  selectedProgramId: string,
  client: Window["fetch"]
): string {
  return renderPage(<ProgramDetailsHtml programs={programs} selectedProgramId={selectedProgramId} client={client} />);
}
