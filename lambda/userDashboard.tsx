import React from "react";

import { renderPage } from "./render";
import { UserDashboardHtml } from "../src/pages/userDashboard/userDashboardHtml";
import { IEventPayload } from "../src/api/service";
import { IUserDashboardData } from "../src/pages/userDashboard/userDashboardContent";

export function renderUserDashboardHtml(
  client: Window["fetch"],
  adminKey: string,
  userDao: IUserDashboardData | undefined,
  events: IEventPayload[]
): string {
  return renderPage(<UserDashboardHtml client={client} adminKey={adminKey} userDao={userDao} events={events} />);
}
