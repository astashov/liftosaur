import RB from "rollbar";
import { hydrate, JSX } from "preact";
import { RollbarUtils_config } from "./rollbar";
import { IPageWrapperProps } from "../components/pageWrapper";

declare let Rollbar: RB;
declare let __ENV__: string;

export function HydrateUtils_hydratePage<T>(cb: (pageWrapperProps: IPageWrapperProps, data: T) => JSX.Element): void {
  Rollbar.configure(RollbarUtils_config());

  const escapedRawData = document.querySelector("#data")?.innerHTML || "{}";
  const escapedPageWrapperProps = document.querySelector("#pagewrapper")?.innerHTML || "{}";
  const parser = new DOMParser();
  const unescapedRawData = parser.parseFromString(escapedRawData, "text/html").documentElement.textContent || "{}";
  const unescapedPageWrapperProps =
    parser.parseFromString(escapedPageWrapperProps, "text/html").documentElement.textContent || "{}";
  const data = JSON.parse(unescapedRawData) as T;
  const pageWrapperProps = JSON.parse(unescapedPageWrapperProps) as IPageWrapperProps;
  hydrate(cb({ ...pageWrapperProps, client: window.fetch.bind(window) }, data), document.getElementById("app")!);
}
