import { IPaymentDao } from "./dao/paymentDao";
import { PaymentsDashboardHtml } from "../src/pages/paymentsDashboard/paymentsDashboardHtml";
import { renderPage } from "./render";

export interface IPaymentsDashboardData {
  date: string;
  payments: IPaymentDao[];
}

export interface IPaymentsDashboardUserAffiliate {
  affiliateId: string;
  timestamp: number;
}

export interface IPaymentsSummary {
  currencyTotals: Record<string, { total: number; refunds: number }>;
  totalsByTypeAndCurrency: Record<string, { subscription: number; inapp: number }>;
  totalsByPlatformAndCurrency: Record<string, { apple: number; google: number }>;
  totalUSD: number;
  refundsUSD: number;
  totalSubscriptionUSD: number;
  totalInappUSD: number;
  totalAppleUSD: number;
  totalGoogleUSD: number;
  totalPurchases: number;
  totalSubscriptionPurchases: number;
  totalInappPurchases: number;
  totalApplePurchases: number;
  totalGooglePurchases: number;
  totalRenewals: number;
  totalRefunds: number;
  totalFreeTrials: number;
  totalCancellations: number;
  monthlyCancellations: number;
  yearlyCancellations: number;
}

export function renderPaymentsDashboardHtml(
  client: Window["fetch"],
  apiKey: string,
  paymentsData: IPaymentsDashboardData[],
  userAffiliates: Partial<Record<string, IPaymentsDashboardUserAffiliate>>,
  summary: IPaymentsSummary,
  nextBefore: number,
  hasMore: boolean
): string {
  return renderPage(
    <PaymentsDashboardHtml
      client={client}
      apiKey={apiKey}
      paymentsData={paymentsData}
      userAffiliates={userAffiliates}
      summary={summary}
      nextBefore={nextBefore}
      hasMore={hasMore}
    />
  );
}
