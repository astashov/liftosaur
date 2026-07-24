import { VerifyEmailHtml } from "../src/pages/verifyEmail/verifyEmailHtml";

import { renderPage } from "./render";

export function renderVerifyEmailHtml(client: Window["fetch"], token?: string): string {
  return renderPage(<VerifyEmailHtml client={client} token={token} />);
}
