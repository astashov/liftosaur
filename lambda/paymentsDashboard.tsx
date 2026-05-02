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

export function renderPaymentsDashboardHtml(
  client: Window["fetch"],
  apiKey: string,
  paymentsData: IPaymentsDashboardData[],
  userAffiliates: Partial<Record<string, IPaymentsDashboardUserAffiliate>>
): string {
  return renderPage(
    <PaymentsDashboardHtml
      client={client}
      apiKey={apiKey}
      paymentsData={paymentsData}
      userAffiliates={userAffiliates}
    />
  );
}
