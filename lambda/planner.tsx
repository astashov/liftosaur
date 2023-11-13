import { h } from "preact";

import { renderPage } from "./render";
import { PlannerHtml } from "../src/pages/planner/plannerHtml";
import { IExportedPlannerProgram } from "../src/pages/planner/models/types";
import { IAccount } from "../src/models/account";

export function renderPlannerHtml(
  client: Window["fetch"],
  initialProgram?: IExportedPlannerProgram,
  account?: IAccount
): string {
  return renderPage(<PlannerHtml client={client} initialProgram={initialProgram} account={account} />);
}
