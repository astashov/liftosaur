import { h } from "preact";

import { renderPage } from "./render";
import { UserAffiliatesHtml } from "../src/pages/userAffiliates/userAffiliatesHtml";
import type { IAffiliateDashboardSummary } from "./dao/affiliateDao";
import { IAccount } from "../src/models/account";

export interface ICreatorStats {
  summary: IAffiliateDashboardSummary;
  monthlyPayments: { month: string; revenue: number; count: number }[];
}

export function renderUserAffiliatesHtml(
  client: Window["fetch"],
  account: IAccount | undefined,
  creatorStats: ICreatorStats
): string {
  return renderPage(<UserAffiliatesHtml client={client} account={account} creatorStats={creatorStats} />);
}
