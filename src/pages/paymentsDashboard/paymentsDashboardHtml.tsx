import type { JSX } from "react";
import { Page } from "../../components/page";
import { IPaymentsDashboardData, IPaymentsDashboardUserAffiliate } from "../../../lambda/paymentsDashboard";
import { PaymentsDashboardContent } from "./paymentsDashboardContent";

export interface IPaymentsDashboardHtmlProps {
  paymentsData: IPaymentsDashboardData[];
  userAffiliates: Partial<Record<string, IPaymentsDashboardUserAffiliate>>;
  apiKey: string;
  client: Window["fetch"];
}

export function PaymentsDashboardHtml(props: IPaymentsDashboardHtmlProps): JSX.Element {
  const { client, ...data } = props;

  return (
    <Page
      css={["paymentsdashboard"]}
      js={["paymentsdashboard"]}
      maxWidth={1300}
      title="Payments Dashboard | Liftosaur"
      canonical="https://www.liftosaur.com/dashboards/payments"
      description="The dashboard to see all payments"
      ogUrl="https://www.liftosaur.com/dashboards/payments"
      data={data}
      client={client}
    >
      <PaymentsDashboardContent client={client} {...data} />
    </Page>
  );
}
