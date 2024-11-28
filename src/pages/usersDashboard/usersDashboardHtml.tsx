import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { IUsersDashboardData, UsersDashboardContent } from "./usersDashboardContent";

export interface IUsersDashboardHtmlProps {
  usersData: IUsersDashboardData[];
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
      title="Users Dashboard | Liftosaur"
      canonical="https://www.liftosaur.com/dashboards/users"
      description="The dashboard to see users' activity"
      ogUrl="https://www.liftosaur.com/dashboards/users"
      data={data}
      client={client}
    >
      <UsersDashboardContent client={client} {...data} />
    </Page>
  );
}
