import React, { JSX } from "react";
import { Page } from "../../components/page";
import type { IAffiliateData } from "./affiliateDashboardContent";
import { AffiliateDashboardContent } from "./affiliateDashboardContent";

export interface IAffiliateDashboardHtmlProps {
  affiliateId: string;
  affiliateData: IAffiliateData[];
  client: Window["fetch"];
}

export function AffiliateDashboardHtml(props: IAffiliateDashboardHtmlProps): JSX.Element {
  const { client, ...data } = props;

  return (
    <Page
      css={["affiliatedashboard"]}
      js={["affiliatedashboard"]}
      maxWidth={1020}
      title="Affiliate Dashboard | Liftosaur"
      canonical={`https://www.liftosaur.com/dashboards/affiliate/${props.affiliateId}`}
      ogTitle="Liftosaur: Affiliate Dashboard"
      description="The dashboard to see users' activity came from affiliate"
      ogUrl={`https://www.liftosaur.com/dashboards/affiliate/${props.affiliateId}`}
      data={data}
      client={client}
    >
      <AffiliateDashboardContent client={client} {...data} />
    </Page>
  );
}
