import { h } from "preact";
import { IAccount } from "../src/models/account";
import { MainHtml } from "../src/pages/main/mainHtml";

import { renderPage } from "./render";
import { ITestimonial } from "../src/pages/main/testimonitals";

export function renderMainHtml(
  client: Window["fetch"],
  testimonials: ITestimonial[],
  account?: IAccount,
  userAgent?: string
): string {
  return renderPage(<MainHtml client={client} account={account} userAgent={userAgent} testimonials={testimonials} />);
}
