import { h } from "preact";
import { ProgramPreviewHtml } from "../src/pages/programs/programPreviewHtml";
import { renderPage } from "./render";

export function renderProgramPreviewHtml(client: Window["fetch"]): string {
  return renderPage(<ProgramPreviewHtml client={client} />);
}
