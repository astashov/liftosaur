import { h } from "preact";
import { IAccount } from "../src/models/account";
import { MainHtml } from "../src/pages/main/mainHtml";

import { renderPage } from "./render";

export function renderMainHtml(client: Window["fetch"], account?: IAccount, userAgent?: string): string {
  return renderPage(<MainHtml client={client} account={account} userAgent={userAgent} />);
}
