import { DashboardEditorHtml } from "../src/pages/dashboardEditor/dashboardEditorHtml";
import { IDashboardEditorPageData } from "../src/pages/dashboardEditor/dashboardEditorContent";
import { renderPage } from "./render";

export function renderDashboardEditorHtml(client: Window["fetch"], data: IDashboardEditorPageData): string {
  return renderPage(<DashboardEditorHtml client={client} {...data} />);
}
