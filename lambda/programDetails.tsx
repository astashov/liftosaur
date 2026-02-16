import { h } from "preact";
import { ProgramDetailsHtml } from "../src/pages/programs/programDetailsHtml";
import { IProgram } from "../src/types";

import { renderPage } from "./render";

export function renderProgramDetailsHtml(
  programs: IProgram[],
  selectedProgramId: string,
  client: Window["fetch"],
  fullDescription?: string,
  userAgent?: string
): string {
  return renderPage(
    <ProgramDetailsHtml
      programs={programs}
      selectedProgramId={selectedProgramId}
      fullDescription={fullDescription}
      client={client}
      userAgent={userAgent}
    />
  );
}
