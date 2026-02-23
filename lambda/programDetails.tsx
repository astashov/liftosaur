import { h } from "preact";
import { ProgramDetailsHtml } from "../src/pages/programs/programDetailsHtml";
import { IProgram, ISettings } from "../src/types";
import { IAccount } from "../src/models/account";
import { IProgramIndexEntry } from "../src/models/program";

import { renderPage } from "./render";

export function renderProgramDetailsHtml(
  program: IProgram,
  client: Window["fetch"],
  fullDescription?: string,
  faq?: string,
  userAgent?: string,
  account?: IAccount,
  accountSettings?: ISettings,
  indexEntry?: IProgramIndexEntry
): string {
  return renderPage(
    <ProgramDetailsHtml
      program={program}
      fullDescription={fullDescription}
      faq={faq}
      client={client}
      userAgent={userAgent}
      account={account}
      accountSettings={accountSettings}
      indexEntry={indexEntry}
    />
  );
}
