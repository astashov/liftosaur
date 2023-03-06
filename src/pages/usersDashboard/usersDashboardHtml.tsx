import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { IUserDashboardData, UsersDashboardContent } from "./usersDashboardContent";

export interface IUsersDashboardHtmlProps {
  usersData: IUserDashboardData[];
  apiKey: string;
  client: Window["fetch"];
}

export function UsersDashboardHtml(props: IUsersDashboardHtmlProps): JSX.Element {
  const { client, ...data } = props;

  return (
    <Page
      css={["usersdashboard"]}
      js={["usersdashboard"]}
      maxWidth={1300}
      title="Liftosaur: Users Dashboard"
      ogTitle="Liftosaur: Users Dashboard"
      ogDescription="The dashboard to see users' activity came from affiliate"
      ogUrl="https://www.liftosaur.com/dashboards/users"
      data={data}
    >
      <UsersDashboardContent client={client} {...data} />
    </Page>
  );
}
