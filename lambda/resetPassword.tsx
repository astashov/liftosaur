import { ResetPasswordHtml } from "../src/pages/resetPassword/resetPasswordHtml";

import { renderPage } from "./render";

export function renderResetPasswordHtml(client: Window["fetch"], token?: string): string {
  return renderPage(<ResetPasswordHtml client={client} token={token} />);
}
