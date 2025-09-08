import { h } from "preact";

import { renderPage } from "./render";
import { UserAffiliatesHtml } from "../src/pages/userAffiliates/userAffiliatesHtml";
import type { IAffiliateDashboardSummary } from "./dao/affiliateDao";
import { IAccount } from "../src/models/account";

export function renderUserAffiliatesHtml(
  client: Window["fetch"],
  account: IAccount | undefined,
  summary: IAffiliateDashboardSummary
): string {
  return renderPage(<UserAffiliatesHtml client={client} account={account} summary={summary} />);
}
