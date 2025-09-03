import { h } from "preact";
import { IPaymentDao } from "./dao/paymentDao";
import { PaymentsDashboardHtml } from "../src/pages/paymentsDashboard/paymentsDashboardHtml";
import { renderPage } from "./render";

export interface IPaymentsDashboardData {
  date: string;
  payments: IPaymentDao[];
}

export function renderPaymentsDashboardHtml(
  client: Window["fetch"],
  apiKey: string,
  paymentsData: IPaymentsDashboardData[]
): string {
  return renderPage(<PaymentsDashboardHtml client={client} apiKey={apiKey} paymentsData={paymentsData} />);
}