import { h } from "preact";
import { ProgramDetailsHtml } from "../src/pages/programs/programDetailsHtml";
import { IProgram, ISettings } from "../src/types";
import { IAccount } from "../src/models/account";

import { renderPage } from "./render";

export function renderProgramDetailsHtml(
  program: IProgram,
  client: Window["fetch"],
  fullDescription?: string,
  userAgent?: string,
  account?: IAccount,
  accountSettings?: ISettings
): string {
  return renderPage(
    <ProgramDetailsHtml
      program={program}
      fullDescription={fullDescription}
      client={client}
      userAgent={userAgent}
      account={account}
      accountSettings={accountSettings}
    />
  );
}
