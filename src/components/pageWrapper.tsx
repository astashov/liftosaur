import { JSX, h, ComponentChildren } from "preact";
import { FooterPage } from "./footerPage";
import { TopNavMenu } from "./topNavMenu";

export interface IPageWrapperProps {
  skipTopNavMenu?: boolean;
  skipFooter?: boolean;
  url?: string;
  maxWidth?: number;
  maxBodyWidth?: number;
  children?: ComponentChildren;
  isLoggedIn?: boolean;
  client: Window["fetch"];
}

export function PageWrapper(props: IPageWrapperProps): JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {!props.skipTopNavMenu && (
        <TopNavMenu
          maxWidth={props.maxWidth || 1200}
          current={props.url}
          isLoggedIn={!!props.isLoggedIn}
          client={props.client}
        />
      )}
      <div
        id="app"
        style={{ maxWidth: props.maxBodyWidth || props.maxWidth || 800, margin: "0 auto", width: "100%", flex: 1 }}
      >
        {props.children}
      </div>
      {!props.skipFooter && <FooterPage maxWidth={props.maxWidth || 800} />}
    </div>
  );
}
