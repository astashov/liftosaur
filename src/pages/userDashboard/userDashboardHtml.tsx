import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { UserDashboardContent } from "./userDashboardContent";
import { IUserDao } from "../../../lambda/dao/userDao";
import { IEventPayload } from "../../api/service";

interface IProps {
  client: Window["fetch"];
  adminKey: string;
  userDao: IUserDao;
  events: IEventPayload[];
}

export function UserDashboardHtml(props: IProps): JSX.Element {
  const { client, ...data } = props;
  const url = "https://www.liftosaur.com/dashboard/user";
  const title = `User Dashboard | Liftosaur`;

  return (
    <Page
      css={["userdashboard"]}
      js={["userdashboard"]}
      maxWidth={1200}
      title={title}
      canonical={url}
      nowrapper={true}
      description=""
      ogUrl={url}
      data={data}
      client={client}
    >
      <UserDashboardContent {...data} />
    </Page>
  );
}
