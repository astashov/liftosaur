import { h, JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { FooterPage } from "../../components/footerPage";
import { TopNavMenu } from "../../components/topNavMenu";
import { ITestimonial } from "./testimonitals";
import { Hero } from "./components/hero";
import { CreateYourOwn } from "./components/createYourOwn";
import { BuiltinPrograms } from "./components/builtinPrograms";
import { TrackProgress } from "./components/trackProgress";
import { EditOnDesktop } from "./components/editOnDesktop";
import { TestimonialsView } from "./components/testimonialsView";
import { Service } from "../../api/service";
import { IUserContext } from "../../components/pageWrapper";

export interface IMainContentProps {
  client: Window["fetch"];
  isLoggedIn?: boolean;
  deviceType?: "ios" | "android" | "desktop";
  testimonials: ITestimonial[];
}

export function MainContent(props: IMainContentProps): JSX.Element {
  const [userContext, setUserContext] = useState<IUserContext>({});
  const [isLoggedIn, setIsLoggedIn] = useState(!!props.isLoggedIn);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let source = params.get("cpgsrc");
    if (source) {
      window.localStorage.setItem("source", source);
    }
    source = window.localStorage.getItem("source");
    if (source) {
      for (const link of Array.from(document.querySelectorAll(".google-play-link"))) {
        const href = link.getAttribute("href");
        link.setAttribute("href", `${href}&referrer=${source}`);
      }
      for (const link of Array.from(document.querySelectorAll(".apple-store-link"))) {
        const href = link.getAttribute("href");
        link.setAttribute("href", `${href}&ct=${source}`);
      }
    }
    if (props.isLoggedIn) {
      const service = new Service(props.client);
      service.getUserContext().then((ctx) => {
        setUserContext(ctx);
        if (!ctx.account) {
          setIsLoggedIn(false);
        }
      });
    }
  }, []);

  useEffect(() => {}, []);

  return (
    <div>
      <div className="relative z-10">
        <TopNavMenu
          client={props.client}
          isLoggedIn={isLoggedIn}
          account={userContext.account}
          maxWidth={1200}
          current="/"
        />
        <Hero deviceType={props.deviceType} testimonials={props.testimonials} />
        <CreateYourOwn />
        <BuiltinPrograms />
        <TrackProgress />
        <EditOnDesktop />
        <TestimonialsView testimonials={props.testimonials} />
        <FooterPage maxWidth={1200} />
      </div>
    </div>
  );
}
