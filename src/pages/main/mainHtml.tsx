import { h, JSX } from "preact";
import { Page, IJsonLd } from "../../components/page";
import { MainContent } from "./mainContent";
import { ITestimonial } from "./testimonitals";

interface IProps {
  client: Window["fetch"];
  isLoggedIn?: boolean;
  deviceType?: "ios" | "android" | "desktop";
  testimonials: ITestimonial[];
}

export function MainHtml(props: IProps): JSX.Element {
  const { client, isLoggedIn, ...data } = props;

  const title = "Liftosaur - Free Workout Tracker & Gym Planner App (iOS/Android)";
  const description =
    "Free workout tracker & planner for iOS, Android & web. Build custom lifting programs with Liftoscript or use 50+ built-in routines like GZCLP, 5/3/1, PPL. Track progress with automatic progressive overload.";

  const jsonLd: IJsonLd[] = [
    {
      type: "SoftwareApplication",
      name: "Liftosaur",
      applicationCategory: "HealthApplication",
      operatingSystem: "iOS, Android, Web",
      url: "https://www.liftosaur.com",
      price: "0",
      priceCurrency: "USD",
      featureList:
        "Workout tracking, Custom program builder, Liftoscript scripting language, 50+ built-in programs, Progressive overload, 1RM calculator, Exercise library",
    },
  ];

  return (
    <Page
      nowrapper={true}
      css={["main"]}
      js={["main"]}
      maxWidth={1200}
      title={title}
      ogTitle={title}
      description={description}
      canonical="https://www.liftosaur.com"
      ogUrl="https://www.liftosaur.com"
      jsonLd={jsonLd}
      data={data}
      isLoggedIn={!!isLoggedIn}
      client={client}
      url={"/"}
      redditPixel={true}
    >
      <MainContent client={client} isLoggedIn={isLoggedIn} {...data} />
    </Page>
  );
}
