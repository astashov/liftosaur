import { h } from "preact";
import { ProgramDetailsHtml } from "../src/pages/programs/programDetailsHtml";
import { IProgram } from "../src/types";
import { IProgramIndexEntry } from "../src/models/program";

import { renderPage } from "./render";

export function renderProgramDetailsHtml(
  program: IProgram,
  client: Window["fetch"],
  fullDescription?: string,
  faq?: string,
  userAgent?: string,
  isLoggedIn?: boolean,
  indexEntry?: IProgramIndexEntry
): string {
  return renderPage(
    <ProgramDetailsHtml
      program={program}
      fullDescription={fullDescription}
      faq={faq}
      client={client}
      userAgent={userAgent}
      isLoggedIn={isLoggedIn}
      indexEntry={indexEntry}
    />
  );
}
