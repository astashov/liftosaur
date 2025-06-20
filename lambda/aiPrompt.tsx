import { h } from "preact";
import { renderPage } from "./render";
import { AiPromptHtml } from "../src/pages/ai/aiPromptHtml";
import { IAccount } from "../src/models/account";

export function renderAiPromptHtml(client: Window["fetch"], account?: IAccount): string {
  return renderPage(<AiPromptHtml client={client} account={account} />);
}
