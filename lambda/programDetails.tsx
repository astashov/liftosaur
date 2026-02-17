import { h } from "preact";
import { ProgramDetailsHtml } from "../src/pages/programs/programDetailsHtml";
import { IProgram } from "../src/types";

import { renderPage } from "./render";

export function renderProgramDetailsHtml(
  program: IProgram,
  client: Window["fetch"],
  fullDescription?: string,
  userAgent?: string
): string {
  return renderPage(
    <ProgramDetailsHtml program={program} fullDescription={fullDescription} client={client} userAgent={userAgent} />
  );
}
