import { h } from "preact";
import { IUsersDashboardData } from "../src/pages/usersDashboard/usersDashboardContent";
import { UsersDashboardHtml } from "../src/pages/usersDashboard/usersDashboardHtml";

import { renderPage } from "./render";

export function renderUsersDashboardHtml(
  client: Window["fetch"],
  apiKey: string,
  usersData: IUsersDashboardData[]
): string {
  return renderPage(<UsersDashboardHtml client={client} apiKey={apiKey} usersData={usersData} />);
}
