import { renderPage } from "./render";
import { PlannerHtml } from "../src/pages/planner/plannerHtml";
import { IAccount } from "../src/models/account";
import { IPartialStorage } from "../src/types";
import { IExportedProgram } from "../src/models/program";
import { IPlannerFriendTarget } from "../src/pages/planner/models/plannerProgramSave";

export function renderPlannerHtml(
  client: Window["fetch"],
  initialProgram?: IExportedProgram,
  account?: IAccount,
  partialStorage?: IPartialStorage,
  userAgent?: string
): string {
  return renderPage(
    <PlannerHtml
      client={client}
      initialProgram={initialProgram}
      account={account}
      partialStorage={partialStorage}
      revisions={[]}
      userAgent={userAgent}
    />
  );
}

export function renderFriendPlannerHtml(
  client: Window["fetch"],
  initialProgram: IExportedProgram,
  account: IAccount,
  friendTarget: IPlannerFriendTarget,
  userAgent?: string
): string {
  return renderPage(
    <PlannerHtml
      client={client}
      initialProgram={initialProgram}
      account={account}
      revisions={[]}
      userAgent={userAgent}
      friendTarget={friendTarget}
    />
  );
}
