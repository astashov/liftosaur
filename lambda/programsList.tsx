import { h } from "preact";
import { IAccount } from "../src/models/account";
import { ProgramsListHtml } from "../src/pages/programsList/programsListHtml";
import { IStorage } from "../src/types";

import { renderPage } from "./render";

export function renderProgramsListHtml(
  client: Window["fetch"],
  isMobile: boolean,
  account: IAccount,
  storage: IStorage
): string {
  return renderPage(<ProgramsListHtml client={client} isMobile={isMobile} account={account} storage={storage} />);
}
