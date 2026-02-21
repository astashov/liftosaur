import { h } from "preact";
import { IAccount } from "../src/models/account";
import { IProgramListItem } from "../src/pages/programs/programsPageContent";

import { renderPage } from "./render";
import { ProgramsPageHtml } from "../src/pages/programs/programList/programsPageHtml";

export function renderAllProgramsHtml(
  client: Window["fetch"],
  programs: IProgramListItem[],
  account?: IAccount
): string {
  return renderPage(<ProgramsPageHtml client={client} programs={programs} account={account} />);
}
