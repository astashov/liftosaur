import { h } from "preact";
import { UsersDashboardHtml } from "../src/pages/usersDashboard/usersDashboardHtml";

import { renderPage } from "./render";

export function renderUsersDashboardHtml(client: Window["fetch"], usersData: unknown[]): string {
  return renderPage(<UsersDashboardHtml client={client} usersData={usersData} />);
}
