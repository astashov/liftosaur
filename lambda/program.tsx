import { h } from "preact";
import { IAccount } from "../src/models/account";
import { IExportedProgram } from "../src/models/program";
import { ProgramHtml } from "../src/pages/program/programHtml";
import { IStorage } from "../src/types";

import { renderPage } from "./render";

export function renderProgramHtml(
  client: Window["fetch"],
  isMobile: boolean,
  shouldSyncProgram: boolean,
  program?: IExportedProgram,
  account?: IAccount,
  storage?: IStorage,
  revisions: string[] = []
): string {
  return renderPage(
    <ProgramHtml
      exportedProgram={program}
      shouldSyncProgram={shouldSyncProgram}
      isMobile={isMobile}
      client={client}
      account={account}
      storage={storage}
      revisions={revisions}
    />
  );
}
