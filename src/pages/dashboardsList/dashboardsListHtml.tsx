import type { JSX } from "react";
import { Page } from "../../components/page";
import { VersionTrackerUtils_SERVER_DEVICE_ID } from "../../models/versionTracker/utils";
import { DashboardsListContent, IDashboardsListPageData } from "./dashboardsListContent";

export function DashboardsListHtml(props: IDashboardsListPageData & { client: Window["fetch"] }): JSX.Element {
  const { client, ...data } = props;
  const url = "https://www.liftosaur.com/user/dashboards";
  return (
    <Page
      css={["dashboardsList"]}
      js={["dashboardsList"]}
      maxWidth={1200}
      title="Your Dashboards | Liftosaur"
      description="The graph dashboards from your account"
      canonical={url}
      ogUrl={url}
      data={data}
      isLoggedIn={!!props.account}
      client={client}
      url="/user/dashboards"
    >
      <DashboardsListContent client={client} {...data} deviceId={VersionTrackerUtils_SERVER_DEVICE_ID} />
    </Page>
  );
}
