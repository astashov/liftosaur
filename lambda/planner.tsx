import { h } from "preact";

import { renderPage } from "./render";
import { PlannerHtml } from "../src/pages/planner/plannerHtml";
import { IAccount } from "../src/models/account";
import { IPartialStorage } from "../src/types";
import { IExportedProgram } from "../src/models/program";

export function renderPlannerHtml(
  client: Window["fetch"],
  initialProgram?: IExportedProgram,
  account?: IAccount,
  partialStorage?: IPartialStorage
): string {
  return renderPage(
    <PlannerHtml
      client={client}
      initialProgram={initialProgram}
      account={account}
      partialStorage={partialStorage}
      revisions={[]}
    />
  );
}
