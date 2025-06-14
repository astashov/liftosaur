import { h } from "preact";
import { renderPage } from "./render";
import { AiHtml } from "../src/pages/ai/aiHtml";
import { IAccount } from "../src/models/account";

export function renderAiHtml(client: Window["fetch"], account?: IAccount): string {
  return renderPage(<AiHtml client={client} account={account} />);
}