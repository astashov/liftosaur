import { h } from "preact";
import { IUserDashboardData } from "../src/pages/usersDashboard/usersDashboardContent";
import { UsersDashboardHtml } from "../src/pages/usersDashboard/usersDashboardHtml";

import { renderPage } from "./render";

export function renderUsersDashboardHtml(
  client: Window["fetch"],
  apiKey: string,
  usersData: IUserDashboardData[]
): string {
  return renderPage(<UsersDashboardHtml client={client} apiKey={apiKey} usersData={usersData} />);
}
