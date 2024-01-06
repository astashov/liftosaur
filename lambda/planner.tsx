import { h } from "preact";

import { renderPage } from "./render";
import { PlannerHtml } from "../src/pages/planner/plannerHtml";
import { IExportedPlannerProgram } from "../src/pages/planner/models/types";
import { IAccount } from "../src/models/account";
import { IPartialStorage } from "../src/types";

export function renderPlannerHtml(
  client: Window["fetch"],
  initialProgram?: IExportedPlannerProgram,
  account?: IAccount,
  partialStorage?: IPartialStorage
): string {
  return renderPage(
    <PlannerHtml client={client} initialProgram={initialProgram} account={account} partialStorage={partialStorage} />
  );
}
