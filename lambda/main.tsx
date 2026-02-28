import { h } from "preact";
import { MainHtml } from "../src/pages/main/mainHtml";

import { renderPage } from "./render";
import { ITestimonial } from "../src/pages/main/testimonitals";

export function renderMainHtml(
  client: Window["fetch"],
  testimonials: ITestimonial[],
  isLoggedIn?: boolean,
  deviceType?: "ios" | "android" | "desktop"
): string {
  return renderPage(
    <MainHtml client={client} isLoggedIn={isLoggedIn} deviceType={deviceType} testimonials={testimonials} />
  );
}
