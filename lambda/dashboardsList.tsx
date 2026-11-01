import { DashboardsListHtml } from "../src/pages/dashboardsList/dashboardsListHtml";
import { IDashboardsListPageData } from "../src/pages/dashboardsList/dashboardsListContent";
import { renderPage } from "./render";

export function renderDashboardsListHtml(client: Window["fetch"], data: IDashboardsListPageData): string {
  return renderPage(<DashboardsListHtml client={client} {...data} />);
}
