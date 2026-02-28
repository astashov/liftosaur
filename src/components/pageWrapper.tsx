import { JSX, h, ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { FooterPage } from "./footerPage";
import { TopNavMenu } from "./topNavMenu";
import { IAccount } from "../models/account";
import { IUnit } from "../types";
import { Service } from "../api/service";

export interface IUserContext {
  account?: IAccount;
  units?: IUnit;
}

export interface IPageWrapperProps {
  skipTopNavMenu?: boolean;
  skipFooter?: boolean;
  url?: string;
  maxWidth?: number;
  maxBodyWidth?: number;
  children?: ComponentChildren | ((ctx: IUserContext) => ComponentChildren);
  isLoggedIn?: boolean;
  client: Window["fetch"];
}

export function PageWrapper(props: IPageWrapperProps): JSX.Element {
  const [userContext, setUserContext] = useState<IUserContext>({});
  const [isLoggedIn, setIsLoggedIn] = useState(!!props.isLoggedIn);

  useEffect(() => {
    if (props.isLoggedIn) {
      const service = new Service(props.client);
      service.getUserContext().then((ctx) => {
        setUserContext(ctx);
        if (!ctx.account) {
          setIsLoggedIn(false);
        }
      });
    }
  }, []);

  const children = typeof props.children === "function" ? props.children(userContext) : props.children;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {!props.skipTopNavMenu && (
        <TopNavMenu
          maxWidth={props.maxWidth || 1200}
          current={props.url}
          isLoggedIn={isLoggedIn}
          account={userContext.account}
          client={props.client}
        />
      )}
      <div
        id="app"
        style={{ maxWidth: props.maxBodyWidth || props.maxWidth || 800, margin: "0 auto", width: "100%", flex: 1 }}
      >
        {children}
      </div>
      {!props.skipFooter && <FooterPage maxWidth={props.maxWidth || 800} />}
    </div>
  );
}
