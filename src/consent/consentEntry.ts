import {
  Consent_getMode,
  Consent_getStored,
  Consent_hasGPC,
  Consent_resolve,
  Consent_store,
  IConsentCategories,
  IConsentMode,
} from "./consent";
import { ConsentBanner_openPreferences, ConsentBanner_showBanner } from "./consentBanner";
import {
  Trackers_applyAdvertising,
  Trackers_applyAnalytics,
  Trackers_applyGtagConsent,
  Trackers_revoke,
} from "./trackers";

// Surfaces can opt out of the banner and limit gating to gtag only (set in the page before consent.js
// loads). /app uses { showBanner: false, gtagOnly: true } so it respects the saved choice but never
// shows a banner - older native WebView clients render /app and a banner overlay could break them.
interface ILftConsentConfig {
  showBanner?: boolean;
  gtagOnly?: boolean;
}

function getConfig(): ILftConsentConfig {
  return (window as unknown as { lftConsentConfig?: ILftConsentConfig }).lftConsentConfig ?? {};
}

function applyConsent(categories: IConsentCategories): void {
  const advertising = categories.advertising && !Consent_hasGPC();
  if (getConfig().gtagOnly) {
    Trackers_applyGtagConsent({ analytics: categories.analytics, advertising });
    return;
  }
  Trackers_applyAnalytics(categories.analytics);
  Trackers_applyAdvertising(advertising);
}

function effectiveCurrent(mode: IConsentMode): IConsentCategories {
  const decision = Consent_resolve(mode, Consent_getStored(), Consent_hasGPC());
  return { analytics: decision.analytics, advertising: decision.advertising };
}

// QA helper: ?lftconsent=optin|optout|none forces the mode and re-prompts, so all three flows can be
// tested without an EU IP. Ignored on production so it can't be used to bypass the banner for others.
function getDevOverride(): IConsentMode | undefined {
  try {
    if (window.location.hostname === "www.liftosaur.com") {
      return undefined;
    }
    const v = new URL(window.location.href).searchParams.get("lftconsent");
    return v === "optin" || v === "optout" || v === "none" ? v : undefined;
  } catch {
    return undefined;
  }
}

async function boot(): Promise<void> {
  const override = getDevOverride();
  const mode = override ?? (await Consent_getMode());

  // Persistent control to change/withdraw consent at any time (required) - the footer "Privacy
  // Settings" link calls this. Reload on change so revoking actually unloads trackers.
  const openPreferences = (): void => {
    ConsentBanner_openPreferences(effectiveCurrent(mode), (categories) => {
      Consent_store(categories);
      Trackers_revoke(categories);
      window.location.reload();
    });
  };
  (window as unknown as { lftConsent?: { open: () => void } }).lftConsent = { open: openPreferences };

  if (Consent_hasGPC()) {
    Trackers_revoke({ analytics: true, advertising: false });
  }

  const decision = Consent_resolve(mode, override ? undefined : Consent_getStored(), Consent_hasGPC());
  if (decision.needsBanner && getConfig().showBanner !== false) {
    ConsentBanner_showBanner(mode, (categories) => {
      Consent_store(categories);
      Trackers_revoke(categories);
      applyConsent(categories);
    });
  } else {
    applyConsent(decision);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    boot();
  });
} else {
  boot();
}
