import { h } from "preact";

import { renderPage } from "./render";
import { UserDashboardHtml } from "../src/pages/userDashboard/userDashboardHtml";
import { IEventPayload } from "../src/api/service";
import { IUserDao } from "./dao/userDao";

export function renderUserDashboardHtml(
  client: Window["fetch"],
  adminKey: string,
  userDao: IUserDao,
  events: IEventPayload[]
): string {
  return renderPage(<UserDashboardHtml client={client} adminKey={adminKey} userDao={userDao} events={events} />);
}
