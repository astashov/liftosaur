import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { UserAffiliatesContent } from "./userAffiliatesContent";
import { IAccount } from "../../models/account";
import type { ICreatorStats } from "../../../lambda/userAffiliates";

export interface IUserAffiliatesSummary {
  totalUsers: number;
  signedUpUsers: number;
  paidUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export interface IUserAffiliatesHtmlProps {
  account: IAccount | undefined;
  creatorStats: ICreatorStats;
  client: Window["fetch"];
}

export function UserAffiliatesHtml(props: IUserAffiliatesHtmlProps): JSX.Element {
  const { client, ...data } = props;

  return (
    <Page
      css={["useraffiliates"]}
      js={["useraffiliates"]}
      maxWidth={1200}
      title="Affiliate Program | Liftosaur"
      canonical={`https://www.liftosaur.com/user/affiliates`}
      account={props.account}
      url={`/user/affiliates`}
      ogTitle="Liftosaur: Affiliate Program"
      description="Track your affiliate program earnings and statistics"
      ogUrl={`https://www.liftosaur.com/user/affiliates`}
      data={data}
      client={client}
    >
      <UserAffiliatesContent client={client} {...data} />
    </Page>
  );
}
