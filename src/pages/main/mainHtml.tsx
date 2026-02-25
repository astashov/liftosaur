import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { IAccount } from "../../models/account";
import { MainContent } from "./mainContent";
import { ITestimonial } from "./testimonitals";

interface IProps {
  client: Window["fetch"];
  account?: IAccount;
  testimonials: ITestimonial[];
  userAgent?: string;
}

export function MainHtml(props: IProps): JSX.Element {
  const { client, ...data } = props;

  return (
    <Page
      nowrapper={true}
      css={["main"]}
      js={["main"]}
      maxWidth={1200}
      title="Liftosaur: Weightlifting Planner and Tracker app"
      ogTitle="Liftosaur: Weightlifting Planner and Tracker app"
      description="The app that allows you to build weightlifting programs or pick built-in ones and track your progress"
      canonical="https://www.liftosaur.com"
      ogUrl="https://www.liftosaur.com"
      data={data}
      isLoggedIn={!!props.account}
      client={client}
      url={"/new"}
      redditPixel={true}
    >
      <MainContent client={client} {...data} />
    </Page>
  );
}
