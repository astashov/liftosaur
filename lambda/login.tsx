import React from "react";
import { IAccount } from "../src/models/account";
import { LoginHtml } from "../src/pages/login/loginHtml";

import { renderPage } from "./render";

export function renderLoginHtml(client: Window["fetch"], account?: IAccount, redirectUrl?: string): string {
  return renderPage(<LoginHtml client={client} account={account} redirectUrl={redirectUrl} />);
}
