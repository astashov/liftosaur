import { h } from "preact";
import { renderPage } from "./render";
import { AiPromptHtml } from "../src/pages/ai/aiPromptHtml";

export function renderAiPromptHtml(client: Window["fetch"]): string {
  return renderPage(<AiPromptHtml client={client} />);
}
