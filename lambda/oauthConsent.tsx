import { OauthConsentHtml } from "../src/pages/oauthConsent/oauthConsentHtml";
import { UrlUtils_build } from "../src/utils/url";

import { renderPage } from "./render";

export function renderOauthConsentHtml(clientName: string, redirectUri: string, consentToken: string): string {
  const version = process.env.COMMIT_HASH || "";
  // The client name is self-asserted (open registration), so the redirect host -
  // where the code actually goes - is the only non-spoofable signal to show. Fall
  // back to the raw value; an unparseable redirect_uri is itself worth showing.
  let redirectHost = redirectUri;
  try {
    redirectHost = UrlUtils_build(redirectUri).host || redirectUri;
  } catch {
    redirectHost = redirectUri;
  }
  return renderPage(
    <OauthConsentHtml
      clientName={clientName}
      redirectHost={redirectHost}
      consentToken={consentToken}
      version={version}
    />
  );
}
