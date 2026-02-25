import { h, JSX } from "preact";
import { useEffect } from "preact/hooks";
import { FooterPage } from "../../components/footerPage";
import { TopNavMenu } from "../../components/topNavMenu";
import { ITestimonial } from "./testimonitals";
import { Hero } from "./components/hero";
import { CreateYourOwn } from "./components/createYourOwn";
import { BuiltinPrograms } from "./components/builtinPrograms";
import { TrackProgress } from "./components/trackProgress";
import { EditOnDesktop } from "./components/editOnDesktop";
import { TestimonialsView } from "./components/testimonialsView";

export interface IMainContentProps {
  client: Window["fetch"];
  isLoggedIn?: boolean;
  deviceType?: "ios" | "android" | "desktop";
  testimonials: ITestimonial[];
}

export function MainContent(props: IMainContentProps): JSX.Element {
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
  }, []);

  return (
    <div>
      <div className="relative z-10">
        <TopNavMenu client={props.client} isLoggedIn={!!props.isLoggedIn} maxWidth={1200} current="/#programs" />
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
