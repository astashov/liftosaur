import type { JSX } from "react";

interface IProps {
  clientName: string;
  redirectHost: string;
  consentToken: string;
  version: string;
}

// Standalone (not wrapped in the shared <Page>) on purpose: a security interstitial
// should ship zero client JS and no third-party scripts (GTM, Rollbar, consent
// banner). It links the same compiled Tailwind bundle every page uses, so colors,
// fonts (Poppins via index.css base layer), and dark mode come from the design
// system rather than bespoke CSS. React escapes clientName/consentToken for us.
//
// The buttons are native <button type="submit"> so the form POSTs with no JS. We
// copy the app <Button> classes rather than using the component itself: <Button>
// renders a react-native Pressable that emits type="button" (non-submitting) and
// needs an onPress JS handler, which a no-JS page can't provide.
const buttonClassName =
  "flex-1 flex items-center justify-center rounded-lg px-8 py-3 text-base font-semibold " +
  "cursor-pointer transition-opacity hover:opacity-90";
const allowClassName = `${buttonClassName} bg-button-primarybackground text-text-alwayswhite`;
const denyClassName = `${buttonClassName} bg-background-purpledark text-text-purple`;

export function OauthConsentHtml(props: IProps): JSX.Element {
  const { clientName, redirectHost, consentToken, version } = props;
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <title>{`Authorize ${clientName} | Liftosaur`}</title>
        <link rel="shortcut icon" type="image/x-icon" href="/icons/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon512.png" />
        <link rel="stylesheet" type="text/css" href={`/oauthconsent.css?version=${version}`} />
      </head>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background-subtle p-4">
          <div className="w-full max-w-md rounded-3xl bg-background-default p-8 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-10 h-10 rounded-lg overflow-hidden inline-block">
                <img src="/images/icon.svg" alt="Liftosaur Logo" width={40} height={40} className="w-10 h-10" />
              </span>
              <span className="text-xl font-bold text-text-primary">Liftosaur</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-3">Authorize access</h1>
            <p className="text-base text-text-secondary leading-relaxed mb-4">
              <span className="font-semibold text-text-primary">{clientName}</span> is requesting access to your
              Liftosaur account. If you approve, it will be able to:
            </p>
            <ul className="text-sm text-text-secondary leading-relaxed list-disc pl-5 mb-5">
              <li className="mb-1.5">Read and write your workout programs</li>
              <li className="mb-1.5">Read and write your workout history</li>
              <li className="mb-1.5">Read and change your settings, equipment, and measurements</li>
            </ul>
            <div className="rounded-lg bg-background-cardyellow border border-border-cardyellow p-3 mb-6">
              <p className="text-sm text-text-cardyellow mb-1">
                Liftosaur hasn&apos;t verified this application. The name above is provided by the app itself. If you
                allow it, you&apos;ll be sent to:
              </p>
              <p className="text-sm font-semibold text-text-cardyellow break-all">{redirectHost}</p>
              <p className="text-sm text-text-cardyellow mt-1">Only continue if you recognize this destination.</p>
            </div>
            <form method="POST" action="/oauth/authorize">
              <input type="hidden" name="consent_token" value={consentToken} />
              <div className="flex gap-3">
                <button className={denyClassName} type="submit" name="decision" value="deny">
                  Deny
                </button>
                <button className={allowClassName} type="submit" name="decision" value="allow">
                  Allow
                </button>
              </div>
            </form>
          </div>
        </div>
      </body>
    </html>
  );
}
