import { h } from "preact";
import { IAccount } from "../src/models/account";

import { renderPage } from "./render";
import { ProgramsPageHtml } from "../src/pages/programs/programList/programsPageHtml";
import { IProgramIndexEntry } from "../src/models/program";

export function renderAllProgramsHtml(
  client: Window["fetch"],
  programs: IProgramIndexEntry[],
  account?: IAccount
): string {
  return renderPage(<ProgramsPageHtml client={client} programs={programs} account={account} />);
}
