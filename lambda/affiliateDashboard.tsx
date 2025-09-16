import { h } from "preact";

import { renderPage } from "./render";
import { AffiliateDashboardHtml } from "../src/pages/affiliateDashboard/affiliateDashboardHtml";
import type { IAffiliateData } from "../src/pages/affiliateDashboard/affiliateDashboardContent";
import type { IAffiliateDashboardSummary } from "./dao/affiliateDao";

export function renderAffiliateDashboardHtml(
  client: Window["fetch"],
  affiliateId: string,
  affiliateData: IAffiliateData[],
  summary: IAffiliateDashboardSummary,
  monthlyPayments: { month: string; revenue: number; count: number }[],
  apiKey: string
): string {
  return renderPage(
    <AffiliateDashboardHtml
      client={client}
      affiliateId={affiliateId}
      affiliateData={affiliateData}
      summary={summary}
      monthlyPayments={monthlyPayments}
      apiKey={apiKey}
    />
  );
}
