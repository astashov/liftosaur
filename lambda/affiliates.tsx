import React from "react";
import { IAccount } from "../src/models/account";
import { AffiliatesHtml } from "../src/pages/affiliates/affiliatesHtml";

import { renderPage } from "./render";

export function renderAffiliatesHtml(client: Window["fetch"], account?: IAccount): string {
  return renderPage(<AffiliatesHtml client={client} account={account} />);
}
