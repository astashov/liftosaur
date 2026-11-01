import type { JSX } from "react";
import { Page } from "../../components/page";
import { VersionTrackerUtils_SERVER_DEVICE_ID } from "../../models/versionTracker/utils";
import { HtmlUtils_escapeHtml } from "../../utils/html";
import { DashboardEditorContent, IDashboardEditorPageData } from "./dashboardEditorContent";

export function DashboardEditorHtml(props: IDashboardEditorPageData & { client: Window["fetch"] }): JSX.Element {
  const { client, ...data } = props;
  const url = `https://www.liftosaur.com/user/d/${encodeURIComponent(props.dashboard.id)}`;
  return (
    <Page
      css={["dashboardEditor"]}
      js={["dashboardEditor"]}
      maxWidth={2400}
      title={`Liftosaur: Dashboard | ${HtmlUtils_escapeHtml(props.dashboard.name)}`}
      description="Edit the graphs dashboard from your account"
      canonical={url}
      ogUrl={url}
      data={data}
      isLoggedIn={!!props.account}
      client={client}
      url="/user/dashboards"
    >
      <DashboardEditorContent client={client} {...data} deviceId={VersionTrackerUtils_SERVER_DEVICE_ID} />
    </Page>
  );
}
