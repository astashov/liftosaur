import { JSX, h, ComponentChildren } from "preact";
import { TopNavMenu } from "./topNavMenu";
import { FooterPage } from "./footerPage";
import { IAccount } from "../models/account";

export interface IPageWrapperProps {
  skipTopNavMenu?: boolean;
  skipFooter?: boolean;
  url?: string;
  maxWidth?: number;
  children?: ComponentChildren;
  account?: IAccount;
  client: Window["fetch"];
}

export function PageWrapper(props: IPageWrapperProps): JSX.Element {
  return (
    <div>
      {!props.skipTopNavMenu && (
        <TopNavMenu
          maxWidth={props.maxWidth || 800}
          current={props.url}
          account={props.account}
          client={props.client}
        />
      )}
      <div id="app" style={{ maxWidth: props.maxWidth || 800, margin: "0 auto", width: "100%" }}>
        {props.children}
      </div>
      {!props.skipFooter && <FooterPage maxWidth={props.maxWidth || 800} account={props.account} />}
    </div>
  );
}
