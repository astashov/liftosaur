import React, { JSX } from "react";
import { Account } from "../../components/account";
import { FooterPage } from "../../components/footerPage";
import { TopNavMenu } from "../../components/topNavMenu";
import { IAccount } from "../../models/account";

export interface ILoginContentProps {
  client: Window["fetch"];
  redirectUrl?: string;
  account?: IAccount;
}

export function LoginContent(props: ILoginContentProps): JSX.Element {
  return (
    <div style={{ maxWidth: 1200 }} className="mx-auto">
      <div className="mx-4 md:mx-8">
        <TopNavMenu client={props.client} account={props.account} maxWidth={1200} />
        <div className="py-8 mx-auto" style={{ maxWidth: "24rem" }}>
          <Account client={props.client} account={props.account} redirectUrl={props.redirectUrl} />
        </div>
        <div className="pt-8 mt-16 border-t border-grayv2-100">
          <FooterPage maxWidth={1200} withoutBg={true} account={props.account} />
        </div>
      </div>
    </div>
  );
}
